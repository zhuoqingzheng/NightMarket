import type { Tier } from '@night-market/shared';
import { cn } from '../lib/cn';
import { TIERS } from '../lib/tiers';

interface TierChipProps {
  tier: Tier;
  className?: string;
}

export function TierChip({ tier, className }: TierChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        TIERS[tier].chip,
        className,
      )}
    >
      {TIERS[tier].name}
    </span>
  );
}
