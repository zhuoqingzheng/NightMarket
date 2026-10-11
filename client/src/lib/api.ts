import type {
  Booking,
  BookingResponse,
  BookingsResponse,
  BookStallRequest,
  ErrorCode,
  ErrorResponse,
  EventDetail,
  EventResponse,
  EventsResponse,
  EventSummary,
  LoginRequest,
  Merchant,
  MerchantResponse,
  MeResponse,
  MoveBookingRequest,
  RegisterRequest,
} from '@night-market/shared';

/** The server's error codes, plus the two ways a request can fail without one. */
export type ClientErrorCode = ErrorCode | 'NETWORK' | 'UNKNOWN';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;

  constructor(status: number, code: ClientErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  /** Sent as JSON. */
  body?: unknown;
}

/** Our server's error body, as opposed to, say, a proxy's error page. */
function isErrorResponse(data: unknown): data is ErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string' &&
    'error' in data &&
    typeof data.error === 'string'
  );
}

async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Can’t reach the server. Check it’s running, then try again.');
  }

  if (response.status === 204) return undefined as TResponse;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isErrorResponse(data)) throw new ApiError(response.status, data.code, data.error);
    throw new ApiError(response.status, 'UNKNOWN', 'Something went wrong. Please try again.');
  }
  return data as TResponse;
}

/** One method per endpoint. Request and response shapes come from the shared contract. */
export const api = {
  me: (): Promise<Merchant | null> => request<MeResponse>('/auth/me').then((r) => r.merchant),

  login: (input: LoginRequest): Promise<Merchant> =>
    request<MerchantResponse>('/auth/login', { method: 'POST', body: input }).then((r) => r.merchant),

  register: (input: RegisterRequest): Promise<Merchant> =>
    request<MerchantResponse>('/auth/register', { method: 'POST', body: input }).then((r) => r.merchant),

  logout: (): Promise<void> => request<void>('/auth/logout', { method: 'POST' }),

  events: (): Promise<EventSummary[]> => request<EventsResponse>('/events').then((r) => r.events),

  event: (slug: string): Promise<EventDetail> =>
    request<EventResponse>(`/events/${encodeURIComponent(slug)}`).then((r) => r.event),

  bookings: (): Promise<Booking[]> => request<BookingsResponse>('/bookings').then((r) => r.bookings),

  book: (stallId: number): Promise<Booking> =>
    request<BookingResponse>('/bookings', {
      method: 'POST',
      body: { stallId } satisfies BookStallRequest,
    }).then((r) => r.booking),

  moveBooking: (bookingId: number, stallId: number): Promise<Booking> =>
    request<BookingResponse>(`/bookings/${bookingId}/move`, {
      method: 'POST',
      body: { stallId } satisfies MoveBookingRequest,
    }).then((r) => r.booking),

  cancelBooking: (bookingId: number): Promise<void> => request<void>(`/bookings/${bookingId}`, { method: 'DELETE' }),
};
