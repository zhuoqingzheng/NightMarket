/**
 * The Night Market API contract: every shape that crosses the wire between the
 * server and the client, defined once.
 *
 * Types only. Both sides import this file with `import type`, which is erased
 * at runtime, so it is never loaded or built.
 */

// ─── Vocabulary ─────────────────────────────────────────────────────────────

/** Sets a stall's price. */
export type Tier = 'prime' | 'corner' | 'standard';

/** A stall as the signed-in merchant sees it. */
export type StallStatus = 'available' | 'taken' | 'mine';

/** Worked out from the event's dates and how many stalls are left. */
export type EventStatus = 'open' | 'few-left' | 'sold-out' | 'ended';

/** Colour palette for the event's illustration. */
export type EventTheme = 'riverside' | 'lantern' | 'harbour' | 'laneway';

// ─── Resources ──────────────────────────────────────────────────────────────

export interface Merchant {
  id: number;
  email: string;
  contactName: string;
  businessName: string;
  cuisine: string;
}

/** What every view of an event includes. */
export interface EventBasics {
  id: number;
  slug: string;
  title: string;
  venue: string;
  /** ISO 8601 timestamp. */
  startsAt: string;
  /** ISO 8601 timestamp. */
  endsAt: string;
  theme: EventTheme;
}

export interface EventAvailability {
  status: EventStatus;
  totalStalls: number;
  availableStalls: number;
}

/** An event as listed on the events page. */
export interface EventSummary extends EventBasics, EventAvailability {
  tagline: string;
  minPriceCents: number;
  maxPriceCents: number;
  /** The merchant's stall at this event, e.g. "B4", or null if they haven't booked. */
  myStallLabel: string | null;
}

/** An event with its floor plan. */
export interface EventDetail extends EventBasics, EventAvailability {
  tagline: string;
  description: string;
  address: string;
  /** Landmark along the top of the map, e.g. "River stage". */
  mapTop: string;
  /** Landmark along the bottom of the map, e.g. "Main entrance". */
  mapBottom: string;
  gridRows: number;
  gridCols: number;
  centerpiece: Centerpiece | null;
  stalls: Stall[];
  /** The merchant's booking at this event, or null if they haven't booked. */
  myBooking: Booking | null;
}

export interface Stall {
  id: number;
  /** Row letter and number, e.g. "B4". */
  label: string;
  /** Zero-based position on the floor-plan grid. */
  row: number;
  col: number;
  tier: Tier;
  priceCents: number;
  status: StallStatus;
}

/** A feature area in the middle of the floor plan, such as a garden. */
export interface Centerpiece {
  label: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

export interface Booking {
  id: number;
  /** Shown to the merchant, e.g. "NM-7K2QX9". */
  reference: string;
  priceCents: number;
  /** ISO 8601 timestamp. */
  createdAt: string;
  stall: Pick<Stall, 'id' | 'label' | 'tier'>;
  event: EventBasics;
}

// ─── Request bodies ─────────────────────────────────────────────────────────

/** POST /api/auth/register */
export interface RegisterRequest {
  contactName: string;
  businessName: string;
  /** May be empty. */
  cuisine: string;
  email: string;
  /** At least 8 characters. */
  password: string;
}

/** POST /api/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /api/bookings */
export interface BookStallRequest {
  stallId: number;
}

/** POST /api/bookings/:id/move switches a booking to another stall at the same event. */
export interface MoveBookingRequest {
  stallId: number;
}

// ─── Response bodies ────────────────────────────────────────────────────────
// POST /api/auth/logout and DELETE /api/bookings/:id reply 204 No Content.

/** GET /api/auth/me. `merchant` is null when nobody is signed in. */
export interface MeResponse {
  merchant: Merchant | null;
}

/** POST /api/auth/register and POST /api/auth/login */
export interface MerchantResponse {
  merchant: Merchant;
}

/** GET /api/events */
export interface EventsResponse {
  events: EventSummary[];
}

/** GET /api/events/:slug */
export interface EventResponse {
  event: EventDetail;
}

/** GET /api/bookings */
export interface BookingsResponse {
  bookings: Booking[];
}

/** POST /api/bookings and POST /api/bookings/:id/move */
export interface BookingResponse {
  booking: Booking;
}

// ─── Live updates ───────────────────────────────────────────────────────────

/**
 * The data of each `stalls` message on GET /api/events/:slug/live (server-sent events),
 * sent whenever a stall at that event is booked or freed.
 */
export interface StallChange {
  stallId: number;
  /** "mine" depends on who's looking, so a broadcast never uses it. */
  status: Exclude<StallStatus, 'mine'>;
  /** Server time, in milliseconds since the epoch. */
  at: number;
}

// ─── Errors ─────────────────────────────────────────────────────────────────

/** Every error code the server sends. */
export type ErrorCode =
  // Any endpoint
  | 'BAD_JSON'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED'
  | 'INTERNAL'
  // Accounts
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  // Events and bookings
  | 'EVENT_NOT_FOUND'
  | 'STALL_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  | 'EVENT_ENDED'
  | 'STALL_TAKEN'
  | 'ALREADY_BOOKED'
  | 'WRONG_EVENT'
  | 'SAME_STALL';

/** The body of every error response (4xx and 5xx). */
export interface ErrorResponse {
  /** Written for the merchant, so it's safe to show as is. */
  error: string;
  code: ErrorCode;
}
