import type { Booking, EventDetail, Stall } from '@night-market/shared';
import { ArrowRight, Check, CircleCheck, Moon, Ticket, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../helpers/cn';
import { formatMoney, formatMoneyDelta, formatShortDate } from '../helpers/format';
import { STALL_INCLUDES, summariseTiers, TIERS } from '../helpers/tiers';
import { LanternMark } from './Logo';
import { TierChip } from './TierChip';
import { Button } from './ui/Button';

interface BookingPanelProps {
  event: EventDetail;
  selected: Stall | null;
  /** The request in flight, if any. */
  busy: 'book' | 'move' | null;
  onBook: (stall: Stall) => void;
  onMove: (stall: Stall) => void;
  onClear: () => void;
  onCancel: () => void;
}

export function BookingPanel({ event, selected, busy, onBook, onMove, onClear, onCancel }: BookingPanelProps) {
  const booking = event.myBooking;

  let key: string;
  let content: ReactNode;
  if (event.status === 'ended') {
    key = 'ended';
    content = <EndedState booking={booking} />;
  } else if (booking && selected) {
    key = `switch-${selected.id}`;
    content = <SwitchState booking={booking} stall={selected} busy={busy} onMove={onMove} onKeep={onClear} />;
  } else if (booking) {
    key = `booked-${booking.stall.id}`;
    content = <BookedState booking={booking} onCancel={onCancel} />;
  } else if (selected) {
    key = `selected-${selected.id}`;
    content = <SelectedState stall={selected} busy={busy} onBook={onBook} onClear={onClear} />;
  } else if (event.availableStalls === 0) {
    key = 'sold-out';
    content = <SoldOutState />;
  } else {
    key = 'choose';
    content = <ChooseState event={event} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-stone-900/[0.07]">
      <div key={key} className="animate-rise">
        {content}
      </div>
    </div>
  );
}

interface EyebrowProps {
  children: ReactNode;
}

function Eyebrow({ children }: EyebrowProps) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">{children}</p>;
}

interface ChooseStateProps {
  event: EventDetail;
}

function ChooseState({ event }: ChooseStateProps) {
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold tracking-tight text-stone-900">Choose your stall</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Select any open stall on the floor plan to see what’s included and reserve it.
      </p>

      <ul className="mt-5 divide-y divide-stone-100 border-y border-stone-100">
        {summariseTiers(event.stalls).map(({ tier, priceCents, total, available }) => (
          <li key={tier} className="flex items-center gap-3 py-3">
            <span className={cn('size-4 shrink-0 rounded-[5px] ring-1 ring-inset', TIERS[tier].swatch)} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-stone-900">{TIERS[tier].name}</div>
              <div className="text-xs text-stone-500">
                {available === 0 ? 'All taken' : `${available} of ${total} open`}
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums text-stone-900">{formatMoney(priceCents)}</div>
          </li>
        ))}
      </ul>

      <p className="mt-5 flex gap-2.5 text-xs leading-relaxed text-stone-500">
        <Zap className="mt-px size-3.5 shrink-0 text-lantern-500" />
        First come, first served. Your stall is confirmed the moment you reserve it.
      </p>
    </div>
  );
}

interface SelectedStateProps {
  stall: Stall;
  busy: BookingPanelProps['busy'];
  onBook: (stall: Stall) => void;
  onClear: () => void;
}

function SelectedState({ stall, busy, onBook, onClear }: SelectedStateProps) {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Stall</Eyebrow>
          <p className="mt-1 font-display text-6xl leading-none tracking-tight text-stone-900">{stall.label}</p>
        </div>
        <TierChip tier={stall.tier} className="mt-1" />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-stone-600">{TIERS[stall.tier].blurb}</p>

      <ul className="mt-5 space-y-2 text-sm text-stone-600">
        {STALL_INCLUDES.map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <Check className="size-4 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-baseline justify-between border-t border-stone-100 pt-5">
        <span className="text-sm text-stone-500">Stall fee</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-stone-900">
          {formatMoney(stall.priceCents)}
        </span>
      </div>

      <Button size="lg" className="mt-5 w-full" loading={busy === 'book'} onClick={() => onBook(stall)}>
        Reserve stall {stall.label}
      </Button>
      <Button variant="ghost" size="sm" className="mt-2 w-full" disabled={busy !== null} onClick={onClear}>
        Clear selection
      </Button>
    </div>
  );
}

interface BookedStateProps {
  booking: Booking;
  onCancel: () => void;
}

function BookedState({ booking, onCancel }: BookedStateProps) {
  return (
    <>
      <div className="relative overflow-hidden bg-linear-to-br from-lantern-500 to-lantern-700 px-6 py-5 text-white">
        <LanternMark className="absolute -right-3 -top-2 size-24 rotate-12 text-white/10" />
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CircleCheck className="size-4" />
          You’re booked
        </p>
        <p className="mt-1 text-xs text-white/75">
          Reference <span className="font-mono tracking-wide text-white">{booking.reference}</span>
        </p>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>Your stall</Eyebrow>
            <p className="mt-1 font-display text-6xl leading-none tracking-tight text-stone-900">
              {booking.stall.label}
            </p>
          </div>
          <TierChip tier={booking.stall.tier} className="mt-1" />
        </div>

        <dl className="mt-6 space-y-2.5 border-t border-stone-100 pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Stall fee</dt>
            <dd className="font-medium tabular-nums text-stone-900">{formatMoney(booking.priceCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Booked on</dt>
            <dd className="font-medium text-stone-900">{formatShortDate(booking.createdAt)}</dd>
          </div>
        </dl>

        <p className="mt-5 rounded-xl bg-stone-50 px-4 py-3 text-xs leading-relaxed text-stone-500">
          Want a different spot? Select any open stall on the map to switch. You’ll keep the same reference.
        </p>

        <Button variant="danger" size="sm" className="mt-5 w-full" onClick={onCancel}>
          Cancel booking
        </Button>
      </div>
    </>
  );
}

interface SwitchStateProps {
  booking: Booking;
  /** The stall to switch to. */
  stall: Stall;
  busy: BookingPanelProps['busy'];
  onMove: (stall: Stall) => void;
  onKeep: () => void;
}

function SwitchState({ booking, stall, busy, onMove, onKeep }: SwitchStateProps) {
  const delta = stall.priceCents - booking.priceCents;
  return (
    <div className="p-6">
      <h2 className="text-base font-semibold tracking-tight text-stone-900">Switch stalls?</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Your booking moves to {stall.label}, and {booking.stall.label} is released to other vendors.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <StallSummary caption="Current" label={booking.stall.label} tier={booking.stall.tier} priceCents={booking.priceCents} tone="mine" />
        <ArrowRight className="size-4 shrink-0 text-stone-300" />
        <StallSummary caption="New" label={stall.label} tier={stall.tier} priceCents={stall.priceCents} tone="selected" />
      </div>

      <div className="mt-6 flex items-baseline justify-between border-t border-stone-100 pt-5">
        <span className="text-sm text-stone-500">Price difference</span>
        <span
          className={cn(
            'tabular-nums',
            delta === 0 ? 'text-sm font-medium text-stone-500' : 'text-lg font-semibold',
            delta > 0 && 'text-stone-900',
            delta < 0 && 'text-emerald-700',
          )}
        >
          {formatMoneyDelta(delta)}
        </span>
      </div>

      <Button size="lg" className="mt-5 w-full" loading={busy === 'move'} onClick={() => onMove(stall)}>
        Switch to {stall.label}
      </Button>
      <Button variant="ghost" size="sm" className="mt-2 w-full" disabled={busy !== null} onClick={onKeep}>
        Keep {booking.stall.label}
      </Button>
    </div>
  );
}

interface StallSummaryProps extends Pick<Stall, 'label' | 'tier' | 'priceCents'> {
  caption: string;
  tone: 'mine' | 'selected';
}

function StallSummary({ caption, label, tier, priceCents, tone }: StallSummaryProps) {
  return (
    <div className="flex-1 rounded-xl bg-stone-50 px-3 py-4 text-center ring-1 ring-inset ring-stone-100">
      <Eyebrow>{caption}</Eyebrow>
      <p
        className={cn(
          'mx-auto mt-2.5 flex h-11 w-14 items-center justify-center rounded-lg font-display text-2xl text-white',
          tone === 'mine' ? 'bg-lantern-500' : 'bg-stone-900',
        )}
      >
        {label}
      </p>
      <p className="mt-2.5 text-xs text-stone-500">
        {TIERS[tier].name} · {formatMoney(priceCents)}
      </p>
    </div>
  );
}

function SoldOutState() {
  return (
    <div className="p-6">
      <div className="flex size-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
        <Ticket className="size-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-stone-900">Fully booked</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Every stall has been taken. Cancellations go straight back onto the map, and this page updates live, so
        keep it open.
      </p>
    </div>
  );
}

interface EndedStateProps {
  booking: Booking | null;
}

function EndedState({ booking }: EndedStateProps) {
  return (
    <div className="p-6">
      <div className="flex size-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
        <Moon className="size-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-tight text-stone-900">This market has finished</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        Bookings are closed.
        {booking && ` You traded from stall ${booking.stall.label}.`}
      </p>
    </div>
  );
}
