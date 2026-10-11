import type { Booking, EventStatus, EventTheme, Tier } from '@night-market/shared';
import { all, one } from './db.ts';
import { HttpError } from './http.ts';

export function eventStatus(endsAt: string, availableStalls: number, totalStalls: number): EventStatus {
  if (Date.parse(endsAt) < Date.now()) return 'ended';
  if (availableStalls === 0) return 'sold-out';
  if (availableStalls <= Math.max(3, Math.ceil(totalStalls * 0.15))) return 'few-left';
  return 'open';
}

/*
 * Row types mirror their SELECT lists instead of reusing the API types. That way, if the
 * contract gains a field the SQL doesn't select, the response fails to compile.
 */

export interface EventRow {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  venue: string;
  address: string;
  startsAt: string;
  endsAt: string;
  theme: EventTheme;
  mapTop: string;
  mapBottom: string;
  /** JSON-encoded `Centerpiece`. */
  centerpiece: string | null;
  gridRows: number;
  gridCols: number;
}

export function findEventBySlug(slug: string): EventRow {
  const event = one<EventRow>(
    `SELECT id, slug, title, tagline, description, venue, address,
            starts_at AS startsAt, ends_at AS endsAt, theme,
            map_top AS mapTop, map_bottom AS mapBottom, centerpiece,
            grid_rows AS gridRows, grid_cols AS gridCols
       FROM events
      WHERE slug = ?`,
    slug,
  );
  if (!event) throw new HttpError(404, 'EVENT_NOT_FOUND', 'We couldn’t find that event.');
  return event;
}

interface BookingRow {
  id: number;
  reference: string;
  priceCents: number;
  createdAt: string;
  stallId: number;
  stallLabel: string;
  stallTier: Tier;
  eventId: number;
  eventSlug: string;
  eventTitle: string;
  eventVenue: string;
  eventStartsAt: string;
  eventEndsAt: string;
  eventTheme: EventTheme;
}

const BOOKING_SELECT = `
  SELECT b.id, b.reference, b.price_cents AS priceCents, b.created_at AS createdAt,
         s.id AS stallId, s.label AS stallLabel, s.tier AS stallTier,
         e.id AS eventId, e.slug AS eventSlug, e.title AS eventTitle, e.venue AS eventVenue,
         e.starts_at AS eventStartsAt, e.ends_at AS eventEndsAt, e.theme AS eventTheme
    FROM bookings b
    JOIN stalls s ON s.id = b.stall_id
    JOIN events e ON e.id = b.event_id
   WHERE b.status = 'confirmed'`;

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    reference: row.reference,
    priceCents: row.priceCents,
    createdAt: row.createdAt,
    stall: { id: row.stallId, label: row.stallLabel, tier: row.stallTier },
    event: {
      id: row.eventId,
      slug: row.eventSlug,
      title: row.eventTitle,
      venue: row.eventVenue,
      startsAt: row.eventStartsAt,
      endsAt: row.eventEndsAt,
      theme: row.eventTheme,
    },
  };
}

export function bookingsForMerchant(merchantId: number): Booking[] {
  return all<BookingRow>(`${BOOKING_SELECT} AND b.merchant_id = ? ORDER BY e.starts_at`, merchantId).map(toBooking);
}

export function bookingById(bookingId: number): Booking | undefined {
  const row = one<BookingRow>(`${BOOKING_SELECT} AND b.id = ?`, bookingId);
  return row && toBooking(row);
}

export function bookingForEvent(eventId: number, merchantId: number): Booking | undefined {
  const row = one<BookingRow>(`${BOOKING_SELECT} AND b.event_id = ? AND b.merchant_id = ?`, eventId, merchantId);
  return row && toBooking(row);
}
