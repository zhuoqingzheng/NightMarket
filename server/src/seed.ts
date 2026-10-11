import type { EventTheme, Tier } from '@night-market/shared';
import { hashPassword } from './auth.ts';
import { db, one, run, transaction } from './db.ts';

/**
 * Floor plans are drawn as text, one character per grid cell:
 *   P = prime stall   C = corner stall   S = standard stall
 *   . = walkway       # = feature area (stage seating, gardens…)
 * Rows that contain stalls are lettered A, B, C… and stalls are numbered left to right.
 */
interface EventSpec {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  venue: string;
  address: string;
  theme: EventTheme;
  daysFromNow: number;
  opensAt: number;
  closesAt: number;
  mapTop: string;
  mapBottom: string;
  centerpiece?: string;
  /** Stall fee per tier, in whole dollars. */
  prices: Record<Tier, number>;
  /** Share of stalls already booked by other vendors when the demo starts. */
  bookedShare: number;
  /** Stall pre-booked for the main demo account, so "My bookings" isn't empty. */
  demoStall?: string;
  layout: string[];
}

export const DEMO_PASSWORD = 'demo1234';

const DEMO_MERCHANTS = [
  { email: 'demo@nightmarket.app', contactName: 'Alex Chen', businessName: 'Golden Dumpling Co.', cuisine: 'Dumplings' },
  { email: 'sam@nightmarket.app', contactName: 'Sam Rivera', businessName: 'Smoke & Fire Tacos', cuisine: 'Tacos' },
];

const VENDORS: Array<[contactName: string, businessName: string, cuisine: string]> = [
  ['Mei Lin', 'Lucky Noodle Bar', 'Hand-pulled noodles'],
  ['Tom Nguyen', 'Saigon Rolls', 'Vietnamese'],
  ['Priya Shah', 'Chaat Club', 'Indian street food'],
  ['Luca Romano', 'Piccolo Pizza', 'Wood-fired pizza'],
  ['Hana Sato', 'Takoyaki Taro', 'Japanese'],
  ['Diego Alvarez', 'Churro Social', 'Desserts'],
  ['Grace Kim', 'Seoul Skewers', 'Korean BBQ'],
  ['Omar Haddad', 'Falafel Republic', 'Middle Eastern'],
  ['Ana Costa', 'Pastel & Co.', 'Portuguese tarts'],
  ['Ben Walker', 'Smokehouse Sliders', 'Burgers'],
  ['Siti Rahman', 'Satay Station', 'Malaysian'],
  ['Kofi Mensah', 'Jollof Junction', 'West African'],
  ['Elena Petrova', 'Pierogi Place', 'Eastern European'],
  ['Wei Zhang', 'Bao Down', 'Bao'],
  ['Isabella Rossi', 'Gelato Lane', 'Gelato'],
  ['Arjun Patel', 'Dosa Den', 'South Indian'],
  ['Maya Cohen', 'Shakshuka Shack', 'Brunch'],
  ['Kenji Mori', 'Yakitori Yoru', 'Japanese grill'],
  ['Fatima Ali', 'Kebab Kitchen', 'Turkish'],
  ['Lily Tran', 'Pho Real', 'Vietnamese'],
  ['Jack O’Brien', 'Spud Life', 'Loaded potatoes'],
  ['Nina Lopez', 'Arepa Stop', 'Venezuelan'],
  ['Chen Wei', 'Jianbing Jo', 'Chinese crêpes'],
  ['Sofia Greco', 'Souvlaki Brothers', 'Greek'],
  ['Ravi Kumar', 'Biryani Box', 'Indian'],
  ['Emma Wilson', 'Crumb & Co.', 'Bakery'],
  ['Hiro Tanaka', 'Mochi Moon', 'Desserts'],
  ['Zara Ahmed', 'Spice Route Wraps', 'Wraps'],
  ['Pablo Ruiz', 'Paella Pan', 'Spanish'],
  ['Mia Johnson', 'Lemon Squeeze', 'Drinks'],
  ['Thanh Le', 'Banh Xeo Lady', 'Vietnamese'],
  ['Ivy Huang', 'Bubble & Brew', 'Bubble tea'],
  ['Marco Bianchi', 'Arancini Amore', 'Italian'],
  ['Aisha Bello', 'Puff Puff Co.', 'Desserts'],
  ['Noah Davis', 'Hot Dog Hotline', 'Hot dogs'],
  ['Yuki Ito', 'Okonomi Club', 'Japanese'],
];

const EVENTS: EventSpec[] = [
  {
    slug: 'riverside-night-market',
    title: 'Riverside Night Market',
    tagline: 'Friday nights by the water, lit by a thousand lanterns.',
    description:
      'Our flagship weekly market along the river. Expect around 8,000 visitors through the evening, a live band on the river stage and a long golden hour along the promenade. Stalls on the central walkway and the entrance row see the heaviest foot traffic.',
    venue: 'Southbank Promenade',
    address: 'Southbank Boulevard, Southbank VIC',
    theme: 'riverside',
    daysFromNow: 6,
    opensAt: 17,
    closesAt: 23,
    mapTop: 'River stage',
    mapBottom: 'Main entrance',
    prices: { prime: 180, corner: 150, standard: 110 },
    bookedShare: 0.42,
    layout: [
      'CSSSSSP.PSSSSSC',
      'CSSSSSP.PSSSSSC',
      '...............',
      'CSSSSSP.PSSSSSC',
      'CSSSSSP.PSSSSSC',
      '...............',
      'CPPPPPP.PPPPPPC',
    ],
  },
  {
    slug: 'lantern-festival-food-fair',
    title: 'Lantern Festival Food Fair',
    tagline: 'Street food beneath the lantern garden.',
    description:
      'A festival favourite that sells out every year. Stalls ring the illuminated lantern garden, with the dragon dance stage at the head of the plaza. Expect big crowds from opening until close, so bring extra stock.',
    venue: 'Chinatown Plaza',
    address: 'Little Bourke Street, Melbourne VIC',
    theme: 'lantern',
    daysFromNow: 13,
    opensAt: 16,
    closesAt: 22,
    mapTop: 'Dragon dance stage',
    mapBottom: 'Plaza gate',
    centerpiece: 'Lantern garden',
    prices: { prime: 240, corner: 200, standard: 160 },
    bookedShare: 0.87,
    layout: [
      'CPPPPPPPPPC',
      '...........',
      'SS.#####.SS',
      'SS.#####.SS',
      'SS.#####.SS',
      '...........',
      'CSSS...SSSC',
    ],
  },
  {
    slug: 'harbour-hawkers-weekend',
    title: 'Harbour Hawkers Weekend',
    tagline: 'Long lunches and late dinners on the waterfront.',
    description:
      'An all-day hawker market on Pier 3 with communal waterfront dining at its heart. Prime stalls face straight onto the dining area, so you can serve tables directly. Easy loading access from the pier gates.',
    venue: 'Pier 3, Docklands',
    address: 'Harbour Esplanade, Docklands VIC',
    theme: 'harbour',
    daysFromNow: 20,
    opensAt: 11,
    closesAt: 21,
    mapTop: 'Harbour edge',
    mapBottom: 'Pier 3 gates',
    centerpiece: 'Waterfront dining',
    prices: { prime: 160, corner: 135, standard: 95 },
    bookedShare: 0.2,
    demoStall: 'C2',
    layout: [
      'CSSS.SSSSSS.SSSC',
      'CSSS.SSSSSS.SSSC',
      '................',
      'CPPP.######.PPPC',
      'CPPP.######.PPPC',
      '................',
      'CSSS.SSSSSS.SSSC',
    ],
  },
  {
    slug: 'laneway-twilight-feast',
    title: 'Laneway Twilight Feast',
    tagline: 'A laneway takeover with DJs, natural wine and late-night bites.',
    description:
      'Stalls line both sides of the laneway, with a DJ booth at the far end. A newer event with a younger crowd, so it suits desserts, drinks and anything you can eat standing up.',
    venue: 'Fitzroy Laneways',
    address: 'Rose Street, Fitzroy VIC',
    theme: 'laneway',
    daysFromNow: 27,
    opensAt: 16,
    closesAt: 23,
    mapTop: 'DJ booth',
    mapBottom: 'Laneway entrance',
    prices: { prime: 130, corner: 110, standard: 80 },
    bookedShare: 0.08,
    layout: [
      'CSSSSS..SSSSSC',
      'CPPPPP..PPPPPC',
      '..............',
      'CPPPPP..PPPPPC',
      'CSSSSS..SSSSSC',
    ],
  },
];

const TIER_CODES: Record<string, Tier> = { P: 'prime', C: 'corner', S: 'standard' };

/** Relative demand per tier, so prime stalls are the first to go in the seeded data. */
const TIER_DEMAND: Record<Tier, number> = { prime: 2.2, corner: 1.6, standard: 1 };

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

interface StallPlan {
  label: string;
  row: number;
  col: number;
  tier: Tier;
}

interface Area {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function atLocalHour(daysFromNow: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function parseLayout(layout: string[]) {
  const cols = layout[0].length;
  const stalls: StallPlan[] = [];
  let area: Area | null = null;
  let rowIndex = 0;

  for (const [row, line] of layout.entries()) {
    if (line.length !== cols) {
      throw new Error(`Layout row ${row} has ${line.length} cells; expected ${cols}.`);
    }
    const letter = String.fromCharCode(65 + rowIndex);
    let number = 0;

    for (const [col, cell] of [...line].entries()) {
      if (cell === '#') {
        if (!area) {
          area = { row, col, rowSpan: 1, colSpan: 1 };
        } else {
          area.rowSpan = Math.max(area.rowSpan, row - area.row + 1);
          area.colSpan = Math.max(area.colSpan, col - area.col + 1);
        }
        continue;
      }
      const tier = TIER_CODES[cell];
      if (!tier) continue;
      number += 1;
      stalls.push({ label: `${letter}${number}`, row, col, tier });
    }
    if (number > 0) rowIndex += 1;
  }

  return { rows: layout.length, cols, stalls, area };
}

export function seedIfEmpty(): boolean {
  const events = one<{ count: number }>('SELECT COUNT(*) AS count FROM events');
  if (events && events.count > 0) return false;
  seedDemoData();
  return true;
}

export function resetDemoData(): void {
  db.exec('DELETE FROM bookings; DELETE FROM sessions; DELETE FROM stalls; DELETE FROM events; DELETE FROM merchants;');
  seedDemoData();
}

function seedDemoData(): void {
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const random = mulberry32(20261010);
  const reference = () =>
    `NM-${Array.from({ length: 6 }, () => REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length)]).join('')}`;

  const insertMerchant = (email: string, contactName: string, businessName: string, cuisine: string) =>
    Number(
      run(
        `INSERT INTO merchants (email, password_hash, contact_name, business_name, cuisine)
         VALUES (?, ?, ?, ?, ?)`,
        email,
        passwordHash,
        contactName,
        businessName,
        cuisine,
      ).lastInsertRowid,
    );

  const insertBooking = (eventId: number, stall: { id: number; priceCents: number }, merchantId: number) =>
    run(
      `INSERT INTO bookings (reference, event_id, stall_id, merchant_id, price_cents)
       VALUES (?, ?, ?, ?, ?)`,
      reference(),
      eventId,
      stall.id,
      merchantId,
      stall.priceCents,
    );

  transaction(() => {
    const [demoMerchantId] = DEMO_MERCHANTS.map((m) =>
      insertMerchant(m.email, m.contactName, m.businessName, m.cuisine),
    );
    const vendorIds = VENDORS.map(([contactName, businessName, cuisine], index) =>
      insertMerchant(`vendor${index + 1}@nightmarket.app`, contactName, businessName, cuisine),
    );

    for (const spec of EVENTS) {
      const plan = parseLayout(spec.layout);
      const eventId = Number(
        run(
          `INSERT INTO events (slug, title, tagline, description, venue, address, starts_at, ends_at,
                               theme, map_top, map_bottom, centerpiece, grid_rows, grid_cols)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          spec.slug,
          spec.title,
          spec.tagline,
          spec.description,
          spec.venue,
          spec.address,
          atLocalHour(spec.daysFromNow, spec.opensAt),
          atLocalHour(spec.daysFromNow, spec.closesAt),
          spec.theme,
          spec.mapTop,
          spec.mapBottom,
          spec.centerpiece && plan.area ? JSON.stringify({ label: spec.centerpiece, ...plan.area }) : null,
          plan.rows,
          plan.cols,
        ).lastInsertRowid,
      );

      const stalls = plan.stalls.map((stall) => {
        const priceCents = spec.prices[stall.tier] * 100;
        const id = Number(
          run(
            `INSERT INTO stalls (event_id, label, grid_row, grid_col, tier, price_cents)
             VALUES (?, ?, ?, ?, ?, ?)`,
            eventId,
            stall.label,
            stall.row,
            stall.col,
            stall.tier,
            priceCents,
          ).lastInsertRowid,
        );
        return { ...stall, id, priceCents };
      });

      const demoStall = spec.demoStall ? stalls.find((stall) => stall.label === spec.demoStall) : undefined;
      if (demoStall) insertBooking(eventId, demoStall, demoMerchantId);

      // Weighted sampling without replacement: popular tiers are more likely to already be gone.
      const alreadyTaken = Math.round(stalls.length * spec.bookedShare) - (demoStall ? 1 : 0);
      const vendors = shuffle(vendorIds, random);
      stalls
        .filter((stall) => stall !== demoStall)
        .map((stall) => ({ stall, key: random() ** (1 / TIER_DEMAND[stall.tier]) }))
        .sort((a, b) => b.key - a.key)
        .slice(0, alreadyTaken)
        .forEach(({ stall }, index) => insertBooking(eventId, stall, vendors[index]));
    }
  });
}
