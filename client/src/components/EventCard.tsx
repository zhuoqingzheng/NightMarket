import type { EventSummary } from '@night-market/shared';
import { ArrowUpRight, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { formatMoney, formatTimeRange, relativeDay } from '../helpers/format';
import { DateBadge } from './DateBadge';
import { AvailabilityMeter, EventStatusPill } from './EventStatus';
import { NightScene } from './NightScene';

interface EventCardProps {
  event: EventSummary;
  /** Position in the list, which staggers the entrance animation. */
  index?: number;
}

export function EventCard({ event, index = 0 }: EventCardProps) {
  return (
    <Link
      to={`/events/${event.slug}`}
      style={{ animationDelay: `${index * 70}ms` }}
      className="group flex animate-rise flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-stone-900/[0.07] transition duration-300 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lantern-500"
    >
      <div className="relative aspect-[14/5] overflow-hidden bg-stone-900">
        <NightScene
          theme={event.theme}
          seed={event.id}
          width={560}
          height={200}
          className="absolute inset-0 size-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        <DateBadge iso={event.startsAt} className="absolute left-4 top-4" />
        <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
          {event.myStallLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-stone-800 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <span className="size-1.5 rounded-full bg-lantern-500" />
              Your stall · {event.myStallLabel}
            </span>
          )}
          {event.status !== 'open' && <EventStatusPill status={event.status} />}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold tracking-tight text-stone-900">{event.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">{event.tagline}</p>
          </div>
          <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-stone-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-900" />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-stone-400" />
            {relativeDay(event.startsAt)} · {formatTimeRange(event.startsAt, event.endsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-stone-400" />
            {event.venue}
          </span>
        </div>

        <div className="mt-auto pt-6">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-stone-600">
              <span className="font-semibold tabular-nums text-stone-900">{event.availableStalls}</span> of{' '}
              {event.totalStalls} stalls open
            </span>
            <span className="text-stone-500">
              from <span className="font-semibold text-stone-900">{formatMoney(event.minPriceCents)}</span>
            </span>
          </div>
          <AvailabilityMeter className="mt-2.5" total={event.totalStalls} available={event.availableStalls} />
        </div>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-900/[0.07]">
      <div className="aspect-[14/5] animate-pulse bg-stone-200/70" />
      <div className="space-y-3 p-6">
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-stone-200/70" />
        <div className="h-3 w-3/4 animate-pulse rounded-md bg-stone-100" />
        <div className="h-3 w-2/3 animate-pulse rounded-md bg-stone-100" />
        <div className="mt-8 h-1.5 w-full animate-pulse rounded-full bg-stone-100" />
      </div>
    </div>
  );
}
