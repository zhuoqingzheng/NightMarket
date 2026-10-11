import type { EventStatus } from '@night-market/shared';
import { cn } from '../lib/cn';

interface StatusStyle {
  label: string;
  text: string;
  dot: string;
}

const STATUS: Record<EventStatus, StatusStyle> = {
  open: { label: 'Booking open', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'few-left': { label: 'Few stalls left', text: 'text-amber-700', dot: 'bg-amber-500' },
  'sold-out': { label: 'Sold out', text: 'text-stone-600', dot: 'bg-stone-400' },
  ended: { label: 'Finished', text: 'text-stone-500', dot: 'bg-stone-300' },
};

interface EventStatusPillProps {
  status: EventStatus;
  className?: string;
}

export function EventStatusPill({ status, className }: EventStatusPillProps) {
  const { label, text, dot } = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ring-black/5 backdrop-blur',
        text,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}

interface AvailabilityMeterProps {
  total: number;
  available: number;
  className?: string;
}

/** A slim bar that fills up as stalls are booked. */
export function AvailabilityMeter({ total, available, className }: AvailabilityMeterProps) {
  const booked = total - available;
  const share = total === 0 ? 0 : booked / total;
  return (
    <div
      role="meter"
      aria-label="Stalls booked"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={booked}
      className={cn('h-1.5 overflow-hidden rounded-full bg-stone-100', className)}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-lantern-300 to-lantern-500 transition-[width] duration-700 ease-out"
        style={{ width: `${share > 0 ? Math.max(share * 100, 3) : 0}%` }}
      />
    </div>
  );
}
