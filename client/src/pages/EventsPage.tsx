import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarX } from 'lucide-react';
import { Link } from 'react-router';
import { EventCard, EventCardSkeleton } from '../components/EventCard';
import { EmptyState, ErrorState } from '../components/States';
import { api } from '../lib/api';
import { firstName, greeting } from '../lib/format';
import { useDocumentTitle, useMerchant } from '../lib/hooks';

export function EventsPage() {
  useDocumentTitle('Upcoming markets');
  const merchant = useMerchant();
  const { data: events, error, isPending, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: api.events,
    // Keep availability fresh while vendors elsewhere are booking.
    refetchInterval: 15_000,
  });

  const bookedCount = events?.filter((event) => event.myStallLabel).length ?? 0;

  return (
    <div>
      <header className="flex animate-rise flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-stone-500">
            {greeting()}, {firstName(merchant.contactName)}
          </p>
          <h1 className="mt-2 font-display text-5xl leading-[1.02] tracking-tight text-stone-900 sm:text-6xl">
            Upcoming markets
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-stone-600">
            Choose a market, then pick your exact pitch on the floor plan. Stalls are first come, first served, and
            the map updates live as other vendors book.
          </p>
        </div>

        {bookedCount > 0 && (
          <Link
            to="/bookings"
            className="group inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-2 pr-3.5 text-[13px] text-stone-600 shadow-xs ring-1 ring-inset ring-stone-200 transition hover:ring-stone-300"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-lantern-500 text-[11px] font-semibold text-white">
              {bookedCount}
            </span>
            {bookedCount === 1 ? 'stall booked' : 'stalls booked'}
            <ArrowRight className="size-3.5 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-stone-900" />
          </Link>
        )}
      </header>

      <div className="mt-10 sm:mt-12">
        {isPending ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<CalendarX className="size-5" />}
            title="No markets scheduled"
            message="New night markets are announced regularly. Check back soon."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
