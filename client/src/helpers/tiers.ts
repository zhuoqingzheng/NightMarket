import type { Stall, Tier } from '@night-market/shared';

/** Display order: the most sought-after stalls first. */
export const TIER_ORDER: readonly Tier[] = ['prime', 'corner', 'standard'];

interface TierInfo {
  name: string;
  blurb: string;
  /** Tailwind classes for the tier's colour in the map legend and booking panel. */
  swatch: string;
  /** Tailwind classes for <TierChip>. */
  chip: string;
}

export const TIERS: Record<Tier, TierInfo> = {
  prime: {
    name: 'Prime',
    blurb: 'Faces the main walkway, where foot traffic is heaviest.',
    swatch: 'bg-amber-100 ring-amber-300',
    chip: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  corner: {
    name: 'Corner',
    blurb: 'Two open sides for longer queues and extra visibility.',
    swatch: 'bg-sky-100 ring-sky-300',
    chip: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
  standard: {
    name: 'Standard',
    blurb: 'Great value with steady passing trade.',
    swatch: 'bg-white ring-stone-300',
    chip: 'bg-stone-100 text-stone-700 ring-stone-200',
  },
};

export const STALL_INCLUDES = ['3 × 3 m pitch', 'Marquee & trestle table', '10 A power outlet'];

export interface TierSummary {
  tier: Tier;
  /** The cheapest stall in the tier. */
  priceCents: number;
  total: number;
  available: number;
}

/** One entry per tier on the floor plan, in display order. Tiers with no stalls are left out. */
export function summariseTiers(stalls: Stall[]): TierSummary[] {
  return TIER_ORDER.flatMap((tier) => {
    const inTier = stalls.filter((stall) => stall.tier === tier);
    if (inTier.length === 0) return [];
    return [
      {
        tier,
        priceCents: Math.min(...inTier.map((stall) => stall.priceCents)),
        total: inTier.length,
        available: inTier.filter((stall) => stall.status === 'available').length,
      },
    ];
  });
}
