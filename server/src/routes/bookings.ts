import { randomInt } from 'node:crypto';
import type {
  Booking,
  BookingResponse,
  BookingsResponse,
  BookStallRequest,
  MoveBookingRequest,
} from '@night-market/shared';
import { type Response, Router } from 'express';
import { currentMerchant } from '../auth.ts';
import { nowIso, one, run, transaction, uniqueViolation } from '../db.ts';
import { bodyOf, HttpError, readId } from '../http.ts';
import { broadcastStallChange } from '../live.ts';
import { bookingById, bookingsForMerchant } from '../queries.ts';

export const bookingsRouter = Router();

interface BookableStall {
  id: number;
  label: string;
  priceCents: number;
  eventId: number;
  endsAt: string;
}

interface OwnBooking {
  id: number;
  eventId: number;
  stallId: number;
  stallLabel: string;
  endsAt: string;
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newReference(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  return `NM-${code}`;
}

function ensureNotEnded(endsAt: string): void {
  if (Date.parse(endsAt) < Date.now()) {
    throw new HttpError(400, 'EVENT_ENDED', 'This event has already finished.');
  }
}

function findBookableStall(stallId: number): BookableStall {
  const stall = one<BookableStall>(
    `SELECT s.id, s.label, s.price_cents AS priceCents, s.event_id AS eventId, e.ends_at AS endsAt
       FROM stalls s
       JOIN events e ON e.id = s.event_id
      WHERE s.id = ?`,
    stallId,
  );
  if (!stall) throw new HttpError(404, 'STALL_NOT_FOUND', 'That stall doesn’t exist.');
  ensureNotEnded(stall.endsAt);
  return stall;
}

function stallTakenError(label: string): HttpError {
  return new HttpError(409, 'STALL_TAKEN', `Stall ${label} was just booked by another vendor.`);
}

function ensureStallFree(stall: BookableStall): void {
  const taken = one("SELECT 1 FROM bookings WHERE stall_id = ? AND status = 'confirmed'", stall.id);
  if (taken) throw stallTakenError(stall.label);
}

function findOwnBooking(bookingId: number, merchantId: number): OwnBooking {
  const booking = one<OwnBooking>(
    `SELECT b.id, b.event_id AS eventId, b.stall_id AS stallId, s.label AS stallLabel, e.ends_at AS endsAt
       FROM bookings b
       JOIN stalls s ON s.id = b.stall_id
       JOIN events e ON e.id = b.event_id
      WHERE b.id = ? AND b.merchant_id = ? AND b.status = 'confirmed'`,
    bookingId,
    merchantId,
  );
  if (!booking) throw new HttpError(404, 'BOOKING_NOT_FOUND', 'We couldn’t find that booking.');
  return booking;
}

function insertBooking(stall: BookableStall, merchantId: number): number {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = run(
        `INSERT INTO bookings (reference, event_id, stall_id, merchant_id, price_cents)
         VALUES (?, ?, ?, ?, ?)`,
        newReference(),
        stall.eventId,
        stall.id,
        merchantId,
        stall.priceCents,
      );
      return Number(result.lastInsertRowid);
    } catch (error) {
      const columns = uniqueViolation(error);
      if (columns === null) throw error;
      if (columns.includes('reference')) continue;
      if (columns.includes('stall_id')) throw stallTakenError(stall.label);
      throw new HttpError(409, 'ALREADY_BOOKED', 'You already have a stall at this event.');
    }
  }
  throw new Error('Could not generate a unique booking reference.');
}

function loadBooking(bookingId: number): Booking {
  const booking = bookingById(bookingId);
  if (!booking) throw new Error(`Booking ${bookingId} vanished mid-request.`);
  return booking;
}

bookingsRouter.get('/', (req, res: Response<BookingsResponse>) => {
  const merchant = currentMerchant(req);
  res.json({ bookings: bookingsForMerchant(merchant.id) });
});

bookingsRouter.post('/', (req, res: Response<BookingResponse>) => {
  const merchant = currentMerchant(req);
  const stallId = readId(bodyOf<BookStallRequest>(req).stallId, 'stall');

  const booking = transaction(() => {
    const stall = findBookableStall(stallId);
    const existing = one<{ label: string }>(
      `SELECT s.label
         FROM bookings b
         JOIN stalls s ON s.id = b.stall_id
        WHERE b.event_id = ? AND b.merchant_id = ? AND b.status = 'confirmed'`,
      stall.eventId,
      merchant.id,
    );
    if (existing) {
      throw new HttpError(
        409,
        'ALREADY_BOOKED',
        `You already hold stall ${existing.label} at this event. Switch stalls instead.`,
      );
    }
    ensureStallFree(stall);
    return loadBooking(insertBooking(stall, merchant.id));
  });

  broadcastStallChange(booking.event.id, { stallId: booking.stall.id, status: 'taken' });
  res.status(201).json({ booking });
});

bookingsRouter.post('/:id/move', (req, res: Response<BookingResponse>) => {
  const merchant = currentMerchant(req);
  const bookingId = readId(req.params.id, 'booking');
  const stallId = readId(bodyOf<MoveBookingRequest>(req).stallId, 'stall');

  const { booking, releasedStallId } = transaction(() => {
    const current = findOwnBooking(bookingId, merchant.id);
    const stall = findBookableStall(stallId);
    if (stall.eventId !== current.eventId) {
      throw new HttpError(400, 'WRONG_EVENT', 'You can only switch to a stall at the same event.');
    }
    if (stall.id === current.stallId) {
      throw new HttpError(400, 'SAME_STALL', `You already hold stall ${stall.label}.`);
    }
    ensureStallFree(stall);
    try {
      run('UPDATE bookings SET stall_id = ?, price_cents = ? WHERE id = ?', stall.id, stall.priceCents, current.id);
    } catch (error) {
      if (uniqueViolation(error)?.includes('stall_id')) throw stallTakenError(stall.label);
      throw error;
    }
    return { booking: loadBooking(current.id), releasedStallId: current.stallId };
  });

  broadcastStallChange(booking.event.id, { stallId: releasedStallId, status: 'available' });
  broadcastStallChange(booking.event.id, { stallId: booking.stall.id, status: 'taken' });
  res.json({ booking });
});

bookingsRouter.delete('/:id', (req, res) => {
  const merchant = currentMerchant(req);
  const bookingId = readId(req.params.id, 'booking');

  const booking = findOwnBooking(bookingId, merchant.id);
  ensureNotEnded(booking.endsAt);
  run("UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE id = ?", nowIso(), booking.id);

  broadcastStallChange(booking.eventId, { stallId: booking.stallId, status: 'available' });
  res.status(204).end();
});
