import type { Booking } from '@night-market/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { DateBadge } from '../components/DateBadge';
import { NightScene } from '../components/NightScene';
import { EmptyState, ErrorState } from '../components/States';
import { TierChip } from '../components/TierChip';
import { Button, buttonStyles } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api } from '../helpers/api';
import { applyMyBooking, refreshBookingData } from '../helpers/bookingCache';
import { formatLongDate, formatMoney, formatShortDate, formatTimeRange, relativeDay } from '../helpers/format';
import { useDocumentTitle } from '../helpers/hooks';

export function BookingsPage() {
  useDocumentTitle('My bookings');
  const queryClient = useQueryClient();
  const { data: bookings, error, isPending, refetch } = useQuery({ queryKey: ['bookings'], queryFn: api.bookings });
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  const cancel = useMutation({
    mutationFn: (booking: Booking) => api.cancelBooking(booking.id),
    onSuccess: (_, booking) => {
      setCancelling(null);
      queryClient.setQueryData<Booking[]>(['bookings'], (current) => current?.filter((item) => item.id !== booking.id));
      applyMyBooking(queryClient, booking.event.slug, null);
      toast('Booking cancelled', {
        description: `Stall ${booking.stall.label} at ${booking.event.title} has been released.`,
      });
    },
    onError: (mutationError) => toast.error(mutationError.message),
    onSettled: (_data, _error, booking) => {
      void refreshBookingData(queryClient, booking.event.slug);
    },
  });

  const totalFees = bookings?.reduce((sum, booking) => sum + booking.priceCents, 0) ?? 0;

  return (
    <div>
      <header className="animate-rise">
        <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-stone-900 sm:text-6xl">My bookings</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-stone-600">
          {bookings && bookings.length > 0
            ? `${bookings.length} ${bookings.length === 1 ? 'stall' : 'stalls'} reserved, ${formatMoney(totalFees)} in stall fees. To move to a different spot, open the floor plan and pick a new stall.`
            : 'Every stall you reserve shows up here, in date order.'}
        </p>
      </header>

      <div className="mt-10 sm:mt-12">
        {isPending ? (
          <div className="space-y-4">
            {[0, 1].map((index) => (
              <div key={index} className="h-44 animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/[0.07]" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={<Ticket className="size-5" />}
            title="No bookings yet"
            message="Pick a market and choose your stall on the floor plan. It’ll appear here the moment it’s confirmed."
            action={
              <Link to="/" className={buttonStyles()}>
                Browse markets
              </Link>
            }
          />
        ) : (
          <ul className="space-y-4">
            {bookings.map((booking, index) => (
              <BookingRow key={booking.id} booking={booking} index={index} onCancel={() => setCancelling(booking)} />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel this booking?"
        description={
          cancelling && (
            <>
              Stall <strong className="font-semibold text-stone-900">{cancelling.stall.label}</strong> at{' '}
              {cancelling.event.title} will be released to other vendors straight away.
            </>
          )
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling)}
        onClose={() => setCancelling(null)}
      />
    </div>
  );
}

interface BookingRowProps {
  booking: Booking;
  /** Position in the list, which staggers the entrance animation. */
  index: number;
  onCancel: () => void;
}

function BookingRow({ booking, index, onCancel }: BookingRowProps) {
  const { event, stall } = booking;
  const eventPath = `/events/${event.slug}`;
  const ended = Date.parse(event.endsAt) < Date.now();

  return (
    <li
      style={{ animationDelay: `${index * 60}ms` }}
      className="flex animate-rise flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-stone-900/[0.07] sm:flex-row"
    >
      <Link
        to={eventPath}
        tabIndex={-1}
        aria-hidden="true"
        className="relative h-32 shrink-0 overflow-hidden bg-stone-900 sm:h-auto sm:w-52"
      >
        <NightScene theme={event.theme} seed={event.id} width={300} height={200} className="absolute inset-0 size-full" />
        <DateBadge iso={event.startsAt} className="absolute left-3 top-3" />
      </Link>

      <div className="flex flex-1 flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-medium text-lantern-600">{relativeDay(event.startsAt)}</p>
          <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-stone-900">
            <Link to={eventPath} className="decoration-stone-300 underline-offset-4 hover:underline">
              {event.title}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {formatLongDate(event.startsAt)} · {formatTimeRange(event.startsAt, event.endsAt)}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-500">
            <MapPin className="size-3.5 text-stone-400" />
            {event.venue}
          </p>
          <p className="mt-3 text-xs text-stone-400">
            Ref <span className="font-mono tracking-wide text-stone-600">{booking.reference}</span> · Booked{' '}
            {formatShortDate(booking.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-end justify-between gap-6 border-t border-stone-100 pt-4 sm:flex-col sm:border-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">Stall</p>
            <div className="mt-1 flex items-center gap-2.5 sm:justify-end">
              <TierChip tier={stall.tier} />
              <span className="font-display text-4xl leading-none tracking-tight text-stone-900">{stall.label}</span>
            </div>
            <p className="mt-1.5 text-sm tabular-nums text-stone-500">{formatMoney(booking.priceCents)}</p>
          </div>
          <div className="flex gap-2">
            <Link to={eventPath} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              View map
            </Link>
            {!ended && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
