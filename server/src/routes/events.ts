import type { Centerpiece, EventResponse, EventsResponse, EventTheme, StallStatus, Tier } from '@night-market/shared';
import { type Response, Router } from 'express';
import { currentMerchant } from '../auth.ts';
import { queryAll } from '../db.ts';
import { openStream } from '../live.ts';
import { bookingForEvent, eventStatus, findEventBySlug } from '../queries.ts';

export const eventsRouter = Router();

interface EventSummaryRow {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  theme: EventTheme;
  totalStalls: number;
  availableStalls: number;
  minPriceCents: number;
  maxPriceCents: number;
  myStallLabel: string | null;
}

interface StallRow {
  id: number;
  label: string;
  row: number;
  col: number;
  tier: Tier;
  priceCents: number;
  status: StallStatus;
}

eventsRouter.get('/', (req, res: Response<EventsResponse>) => {
  const merchant = currentMerchant(req);
  const rows = queryAll<EventSummaryRow>(
    `SELECT e.id, e.slug, e.title, e.tagline, e.venue,
            e.starts_at AS startsAt, e.ends_at AS endsAt, e.theme,
            COUNT(s.id) AS totalStalls,
            COUNT(s.id) - COUNT(b.id) AS availableStalls,
            MIN(s.price_cents) AS minPriceCents,
            MAX(s.price_cents) AS maxPriceCents,
            MAX(CASE WHEN b.merchant_id = ? THEN s.label END) AS myStallLabel
       FROM events e
       JOIN stalls s ON s.event_id = e.id
       LEFT JOIN bookings b ON b.stall_id = s.id AND b.status = 'confirmed'
      GROUP BY e.id
      ORDER BY e.starts_at`,
    merchant.id,
  );

  res.json({
    events: rows.map((row) => ({
      ...row,
      status: eventStatus(row.endsAt, row.availableStalls, row.totalStalls),
    })),
  });
});

eventsRouter.get('/:slug', (req, res: Response<EventResponse>) => {
  const merchant = currentMerchant(req);
  const { centerpiece, ...event } = findEventBySlug(req.params.slug);

  const stalls = queryAll<StallRow>(
    `SELECT s.id, s.label, s.grid_row AS row, s.grid_col AS col, s.tier, s.price_cents AS priceCents,
            CASE
              WHEN b.id IS NULL THEN 'available'
              WHEN b.merchant_id = ? THEN 'mine'
              ELSE 'taken'
            END AS status
       FROM stalls s
       LEFT JOIN bookings b ON b.stall_id = s.id AND b.status = 'confirmed'
      WHERE s.event_id = ?
      ORDER BY s.grid_row, s.grid_col`,
    merchant.id,
    event.id,
  );
  const availableStalls = stalls.filter((stall) => stall.status === 'available').length;

  res.json({
    event: {
      ...event,
      centerpiece: centerpiece ? (JSON.parse(centerpiece) as Centerpiece) : null,
      status: eventStatus(event.endsAt, availableStalls, stalls.length),
      totalStalls: stalls.length,
      availableStalls,
      stalls,
      myBooking: bookingForEvent(event.id, merchant.id) ?? null,
    },
  });
});

eventsRouter.get('/:slug/live', (req, res) => {
  const event = findEventBySlug(req.params.slug);
  openStream(res, event.id);
});
