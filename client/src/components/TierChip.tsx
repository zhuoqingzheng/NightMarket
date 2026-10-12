import type { Tier } from '@night-market/shared';
import { cn } from '../helpers/cn';
import { TIERS } from '../helpers/tiers';

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
