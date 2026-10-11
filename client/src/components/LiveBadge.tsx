import { cn } from '../lib/cn';

interface LiveBadgeProps {
  /** Whether the live-update stream is connected. */
  connected: boolean;
  className?: string;
}

export function LiveBadge({ connected, className }: LiveBadgeProps) {
  return (
    <span
      title={connected ? 'This floor plan updates in real time.' : 'Reconnecting to live updates…'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-colors',
        connected ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80' : 'bg-stone-100 text-stone-500 ring-stone-200',
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {connected && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />}
        <span className={cn('relative inline-flex size-1.5 rounded-full', connected ? 'bg-emerald-500' : 'bg-stone-400')} />
      </span>
      {connected ? 'Live' : 'Connecting…'}
    </span>
  );
}
