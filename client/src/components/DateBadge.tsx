import { cn } from '../lib/cn';
import { dateParts } from '../lib/format';

interface DateBadgeProps {
  /** ISO 8601 timestamp. */
  iso: string;
  className?: string;
}

export function DateBadge({ iso, className }: DateBadgeProps) {
  const { weekday, day, month } = dateParts(iso);
  return (
    <div
      className={cn(
        'flex w-14 flex-col items-center rounded-xl bg-white/95 py-1.5 text-center shadow-sm ring-1 ring-black/5 backdrop-blur',
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lantern-600">{month}</span>
      <span className="text-xl font-semibold leading-tight tabular-nums text-stone-900">{day}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{weekday}</span>
    </div>
  );
}
