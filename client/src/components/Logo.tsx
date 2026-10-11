import { cn } from '../lib/cn';

interface LanternMarkProps {
  className?: string;
}

export function LanternMark({ className }: LanternMarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 1.75v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="8.25" y="3.5" width="7.5" height="2.25" rx="0.75" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="7.25" ry="6.75" fill="currentColor" />
      <path
        d="M12 5.4c-2.6 1.9-2.6 11.3 0 13.2M12 5.4c2.6 1.9 2.6 11.3 0 13.2"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.45"
      />
      <rect x="8.25" y="18.25" width="7.5" height="2.25" rx="0.75" fill="currentColor" />
      <path d="M12 20.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface LogoProps {
  tone?: 'dark' | 'light';
  /** Hide the wordmark on small screens. */
  compact?: boolean;
  className?: string;
}

export function Logo({ tone = 'dark', compact = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LanternMark className="size-6 text-lantern-500" />
      <span
        className={cn(
          'font-display text-[1.45rem] leading-none tracking-tight',
          tone === 'light' ? 'text-white' : 'text-stone-900',
          compact && 'max-sm:sr-only',
        )}
      >
        Night Market
      </span>
    </span>
  );
}
