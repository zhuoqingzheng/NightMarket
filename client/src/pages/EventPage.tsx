import type { Booking, EventDetail, Stall } from '@night-market/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, CalendarX, Clock, MapPin } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { BookingPanel } from '../components/BookingPanel';
import { EventStatusPill } from '../components/EventStatus';
import { LiveBadge } from '../components/LiveBadge';
import { NightScene } from '../components/NightScene';
import { StallLegend, StallMap } from '../components/StallMap';
import { EmptyState, ErrorState } from '../components/States';
import { Button, buttonStyles } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api, ApiError } from '../helpers/api';
import { applyMyBooking, refreshBookingData } from '../helpers/bookingCache';
import { formatLongDate, formatMoney, formatTimeRange } from '../helpers/format';
import { useDocumentTitle } from '../helpers/hooks';
import { TIERS } from '../helpers/tiers';
import { useEventLive } from '../helpers/useEventLive';

export function EventPage() {
  const { slug = '' } = useParams();
  // A fresh view per event, so a selection never carries over from one market to the next.
  return <EventView key={slug} slug={slug} />;
}

interface EventViewProps {
  slug: string;
}

function EventView({ slug }: EventViewProps) {
  const queryClient = useQueryClient();
  const live = useEventLive(slug);
  const { data: event, error, isPending, refetch } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => api.event(slug),
  });
  useDocumentTitle(event?.title);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const picked = event?.stalls.find((stall) => stall.id === selectedId);
  const selected = picked?.status === 'available' ? picked : null;

  useEffect(() => {
    if (selectedId === null) return;
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape' && !document.querySelector('dialog[open]')) setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  const refresh = () => {
    void refreshBookingData(queryClient, slug);
  };

  const onBookingError = (mutationError: Error) => {
    if (mutationError instanceof ApiError && mutationError.code === 'STALL_TAKEN') {
      setSelectedId(null);
      toast.error('Someone just beat you to it', { description: mutationError.message });
    } else {
      toast.error(mutationError.message);
    }
  };

  const book = useMutation({
    mutationFn: (stall: Stall) => api.book(stall.id),
    onSuccess: (booking) => {
      setSelectedId(null);
      applyMyBooking(queryClient, slug, booking);
      toast.success(`Stall ${booking.stall.label} is yours`, {
        description: `Booking reference ${booking.reference}`,
      });
    },
    onError: onBookingError,
    onSettled: refresh,
  });

  const move = useMutation({
    mutationFn: ({ booking, stall }: { booking: Booking; stall: Stall }) => api.moveBooking(booking.id, stall.id),
    onSuccess: (booking) => {
      setSelectedId(null);
      applyMyBooking(queryClient, slug, booking);
      toast.success(`You’ve moved to stall ${booking.stall.label}`, {
        description: `Your reference ${booking.reference} stays the same.`,
      });
    },
    onError: onBookingError,
    onSettled: refresh,
  });

  const cancel = useMutation({
    mutationFn: (booking: Booking) => api.cancelBooking(booking.id),
    onSuccess: (_, booking) => {
      setConfirmingCancel(false);
      applyMyBooking(queryClient, slug, null);
      toast('Booking cancelled', { description: `Stall ${booking.stall.label} is back on the map.` });
    },
    onError: (mutationError) => toast.error(mutationError.message),
    onSettled: refresh,
  });

  // If another vendor takes the stall you're looking at, let go of it and say so. While your own request
  // is in flight, wait: its response explains the outcome better than a second toast would.
  const requesting = book.isPending || move.isPending;
  useEffect(() => {
    if (requesting || !picked || picked.status === 'available') return;
    setSelectedId(null);
    if (picked.status === 'taken') {
      toast.warning(`Stall ${picked.label} was just taken`, {
        description: 'Another vendor got there first. Pick another open stall.',
      });
    }
  }, [picked, requesting]);

  if (isPending) return <EventSkeleton />;

  if (error) {
    if (error instanceof ApiError && error.code === 'EVENT_NOT_FOUND') {
      return (
        <EmptyState
          icon={<CalendarX className="size-5" />}
          title="We couldn’t find that market"
          message="It may have been removed, or the link might be wrong."
          action={
            <Link to="/" className={buttonStyles({ variant: 'secondary' })}>
              Back to markets
            </Link>
          }
        />
      );
    }
    return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  }

  const busy = book.isPending ? 'book' : move.isPending ? 'move' : null;
  const myBooking = event.myBooking;

  function handleSelect(stall: Stall) {
    if (stall.status === 'mine') setSelectedId(null);
    else setSelectedId((current) => (current === stall.id ? null : stall.id));
  }

  function reserve(stall: Stall) {
    if (myBooking) move.mutate({ booking: myBooking, stall });
    else book.mutate(stall);
  }

  return (
    <div>
      <Link
        to="/"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
        All markets
      </Link>

      <EventHero event={event} />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <section
          aria-labelledby="floor-plan-heading"
          className="min-w-0 animate-rise rounded-2xl bg-white p-4 shadow-soft ring-1 ring-stone-900/[0.07] [animation-delay:80ms] sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="floor-plan-heading" className="text-base font-semibold tracking-tight text-stone-900">
                Floor plan
              </h2>
              <p className="mt-0.5 text-sm text-stone-500">
                <span className="font-medium tabular-nums text-stone-900">{event.availableStalls}</span> of{' '}
                {event.totalStalls} stalls open
              </p>
            </div>
            <LiveBadge connected={live} />
          </div>

          <StallMap
            className="mt-5"
            event={event}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
            interactive={busy === null && event.status !== 'ended'}
          />
          <StallLegend className="mt-5" stalls={event.stalls} />
        </section>

        <aside className="animate-rise [animation-delay:140ms] lg:sticky lg:top-24">
          <BookingPanel
            event={event}
            selected={selected}
            busy={busy}
            onBook={reserve}
            onMove={reserve}
            onClear={() => setSelectedId(null)}
            onCancel={() => setConfirmingCancel(true)}
          />
        </aside>
      </div>

      <section className="mt-14 grid gap-10 border-t border-stone-900/[0.07] pt-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div>
          <h2 className="font-display text-3xl tracking-tight text-stone-900">About this market</h2>
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-stone-600">{event.description}</p>
        </div>
        <div className="space-y-5 text-sm">
          <Detail icon={<CalendarDays />} label="Date">
            {formatLongDate(event.startsAt)}
          </Detail>
          <Detail icon={<Clock />} label="Trading hours">
            {formatTimeRange(event.startsAt, event.endsAt)}
          </Detail>
          <Detail icon={<MapPin />} label="Venue">
            {event.venue}
            <span className="block text-stone-500">{event.address}</span>
          </Detail>
        </div>
      </section>

      {selected && event.status !== 'ended' && (
        <MobileActionBar stall={selected} booking={myBooking} busy={busy !== null} onReserve={reserve} />
      )}

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancel your booking?"
        description={
          myBooking && (
            <>
              Stall <strong className="font-semibold text-stone-900">{myBooking.stall.label}</strong> at {event.title}{' '}
              will be released to other vendors straight away. If you change your mind, you’ll need to book again
              while stalls are still free.
            </>
          )
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        loading={cancel.isPending}
        onConfirm={() => myBooking && cancel.mutate(myBooking)}
        onClose={() => setConfirmingCancel(false)}
      />
    </div>
  );
}

interface EventHeroProps {
  event: EventDetail;
}

function EventHero({ event }: EventHeroProps) {
  return (
    <div className="relative mt-5 animate-rise overflow-hidden rounded-3xl bg-stone-900 shadow-lift">
      <NightScene
        theme={event.theme}
        seed={event.id}
        width={1100}
        height={280}
        className="block h-60 w-full sm:h-72"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 p-6 sm:p-8">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white/70">
            {formatLongDate(event.startsAt)} · {formatTimeRange(event.startsAt, event.endsAt)}
          </p>
          <h1 className="mt-1.5 font-display text-4xl leading-none tracking-tight text-white sm:text-[3.25rem]">
            {event.title}
          </h1>
          <p className="mt-2.5 max-w-xl text-sm text-white/75">{event.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.status !== 'open' && <EventStatusPill status={event.status} />}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-white/15 backdrop-blur">
            <MapPin className="size-3.5" />
            {event.venue}
          </span>
        </div>
      </div>
    </div>
  );
}

interface DetailProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}

function Detail({ icon, label, children }: DetailProps) {
  return (
    <div className="flex gap-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-stone-500 shadow-xs ring-1 ring-stone-900/[0.07] [&>svg]:size-4">
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium text-stone-400">{label}</p>
        <p className="mt-0.5 text-stone-800">{children}</p>
      </div>
    </div>
  );
}

interface MobileActionBarProps {
  stall: Stall;
  /** The merchant's current booking, which makes this a switch. */
  booking: Booking | null;
  busy: boolean;
  onReserve: (stall: Stall) => void;
}

/** On small screens the booking panel sits below the map, so keep the key action within thumb's reach. */
function MobileActionBar({ stall, booking, busy, onReserve }: MobileActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 animate-rise border-t border-stone-900/[0.07] bg-white/90 px-5 py-4 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">
            Stall {stall.label} · {TIERS[stall.tier].name}
          </p>
          <p className="text-xs text-stone-500">
            {formatMoney(stall.priceCents)}
            {booking && ` · switching from ${booking.stall.label}`}
          </p>
        </div>
        <Button loading={busy} onClick={() => onReserve(stall)}>
          {booking ? `Switch to ${stall.label}` : 'Reserve'}
        </Button>
      </div>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div>
      <div className="h-5 w-28 animate-pulse rounded-md bg-stone-200/70" />
      <div className="mt-5 h-60 animate-pulse rounded-3xl bg-stone-200/70 sm:h-72" />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="h-[30rem] animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/[0.07]" />
        <div className="h-80 animate-pulse rounded-2xl bg-white ring-1 ring-stone-900/[0.07]" />
      </div>
    </div>
  );
}
