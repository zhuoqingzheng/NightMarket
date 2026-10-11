import type { Booking, EventDetail, Stall } from '@night-market/shared';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Reflect the merchant's new booking (or `null` after a cancellation) in the cached floor plan
 * straight away, so the map responds instantly while the refetch catches up.
 */
export function applyMyBooking(queryClient: QueryClient, slug: string, booking: Booking | null): void {
  queryClient.setQueryData<EventDetail>(['event', slug], (event) => {
    if (!event) return event;
    const stalls = event.stalls.map((stall): Stall => {
      if (booking && stall.id === booking.stall.id) return { ...stall, status: 'mine' };
      if (stall.status === 'mine') return { ...stall, status: 'available' };
      return stall;
    });
    return {
      ...event,
      stalls,
      myBooking: booking,
      availableStalls: stalls.filter((stall) => stall.status === 'available').length,
    };
  });
}

/** Refetch everything a booking change touches: this floor plan, the market list and My bookings. */
export async function refreshBookingData(queryClient: QueryClient, slug: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['event', slug] }),
    queryClient.invalidateQueries({ queryKey: ['events'] }),
    queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  ]);
}
