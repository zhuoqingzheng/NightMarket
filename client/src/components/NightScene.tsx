import type { EventTheme } from '@night-market/shared';
import { useId, useMemo } from 'react';

interface Palette {
  sky: [top: string, horizon: string];
  lantern: string;
  glow: string;
  ground: string;
}

const PALETTES: Record<EventTheme, Palette> = {
  riverside: { sky: ['#0a1030', '#2e3176'], lantern: '#f6a43a', glow: '#ffd27a', ground: '#070a1f' },
  lantern: { sky: ['#160814', '#5c1631'], lantern: '#f2483d', glow: '#ffa25c', ground: '#0e050c' },
  harbour: { sky: ['#03131a', '#0f4f5e'], lantern: '#f8c24a', glow: '#ffe7a3', ground: '#020b0f' },
  laneway: { sky: ['#1a0f27', '#8b3d55'], lantern: '#ffd166', glow: '#fff0c2', ground: '#110918' },
};

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

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

interface Lantern {
  x: number;
  y: number;
  size: number;
  /** Length of the string it hangs from. */
  drop: number;
}

interface Strand {
  /** SVG path of the string. */
  path: string;
  lanterns: Lantern[];
  opacity: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TentRow {
  /** One SVG path for every tent in the row. */
  path: string;
  /** The lit counter in each tent. */
  counters: Box[];
}

interface Scene {
  stars: Star[];
  strands: Strand[];
  back: TentRow;
  front: TentRow;
}

function buildScene(seed: number, width: number, height: number): Scene {
  const random = mulberry32(seed * 7919 + 17);
  const unit = Math.min(7, Math.max(4, Math.min(width, height) * 0.03));
  const between = (min: number, max: number): number => min + random() * (max - min);

  const stars = Array.from({ length: Math.round((width * height) / 3500) }, (): Star => ({
    x: random() * width,
    y: random() * height * 0.6,
    r: between(0.3, 0.9),
    opacity: between(0.2, 0.7),
  }));

  // A strand of lanterns hangs along a quadratic curve that dips to `sag` in the middle.
  const strand = (
    startY: number,
    sag: number,
    endY: number,
    size: number,
    spacing: number,
    opacity: number,
  ): Strand => {
    const p0 = { x: -width * 0.04, y: startY };
    const p2 = { x: width * 1.04, y: endY };
    const p1 = { x: width * between(0.42, 0.58), y: 2 * sag - (startY + endY) / 2 };
    const at = (t: number) => ({
      x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x,
      y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y,
    });
    const count = Math.max(3, Math.round(width / spacing));
    const lanterns: Lantern[] = Array.from({ length: count }, (_, index) => {
      const point = at((index + 0.5 + between(-0.12, 0.12)) / count);
      const lanternSize = size * between(0.85, 1.12);
      const drop = between(1.5, 4.5);
      return { x: point.x, y: point.y + drop + lanternSize, size: lanternSize, drop };
    });
    return { path: `M${p0.x} ${p0.y} Q${p1.x} ${p1.y} ${p2.x} ${p2.y}`, lanterns, opacity };
  };

  const strands = [
    strand(height * between(0.18, 0.26), height * between(0.42, 0.5), height * between(0.16, 0.24), unit * 0.58, unit * 5.2, 0.55),
    strand(height * between(0.02, 0.08), height * between(0.28, 0.36), height * between(0.03, 0.09), unit, unit * 7, 1),
  ];

  // Market tents along the bottom edge, in two layers for a little depth.
  const tents = (minH: number, maxH: number, minW: number, maxW: number): TentRow => {
    const shapes: string[] = [];
    const counters: Box[] = [];
    let x = -between(4, 24);
    while (x < width + 8) {
      const w = between(minW, maxW);
      const h = between(minH, maxH);
      const top = height - h;
      const peak = w * between(0.16, 0.26);
      shapes.push(
        `M${x} ${height}V${top}H${x - 2}L${x + w / 2} ${top - peak}L${x + w + 2} ${top}H${x + w}V${height}Z`,
      );
      counters.push({ x: x + w * 0.16, y: top + h * 0.28, w: w * 0.68, h: Math.max(1.4, h * 0.16) });
      x += w + between(2, 7);
    }
    return { path: shapes.join(''), counters };
  };

  return {
    stars,
    strands,
    back: tents(unit * 4.4, unit * 6.2, unit * 6, unit * 9),
    front: tents(unit * 2.8, unit * 4.2, unit * 7, unit * 11),
  };
}

interface NightSceneProps {
  theme: EventTheme;
  /** Varies the layout of stars, lanterns and tents. The same seed always draws the same scene. */
  seed?: number;
  width?: number;
  height?: number;
  className?: string;
}

/** Generated illustration of a night market: dusk sky, strings of lanterns and glowing stalls. */
export function NightScene({ theme, seed = 1, width = 400, height = 240, className }: NightSceneProps) {
  const palette = PALETTES[theme];
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const scene = useMemo(() => buildScene(seed, width, height), [seed, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.sky[0]} />
          <stop offset="1" stopColor={palette.sky[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor={palette.glow} stopOpacity="0" />
          <stop offset="1" stopColor={palette.glow} stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor={palette.glow} stopOpacity="0.55" />
          <stop offset="0.45" stopColor={palette.glow} stopOpacity="0.16" />
          <stop offset="1" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={width} height={height} fill={`url(#${uid}-sky)`} />
      <rect width={width} height={height} fill={`url(#${uid}-haze)`} />

      {scene.stars.map((star, index) => (
        <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.opacity} />
      ))}

      <path d={scene.back.path} fill={palette.ground} opacity="0.5" />

      {scene.strands.map((strand, strandIndex) => (
        <g key={strandIndex} opacity={strand.opacity}>
          <path d={strand.path} fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="0.6" />
          {strand.lanterns.map((lantern, index) => (
            <g key={index} transform={`translate(${lantern.x} ${lantern.y})`}>
              <circle r={lantern.size * 3.6} fill={`url(#${uid}-glow)`} />
              <line
                y1={-(lantern.drop + lantern.size)}
                y2={-lantern.size}
                stroke="#fff"
                strokeOpacity="0.35"
                strokeWidth="0.5"
              />
              <ellipse rx={lantern.size * 0.84} ry={lantern.size} fill={palette.lantern} />
              <ellipse rx={lantern.size * 0.42} ry={lantern.size * 0.72} fill={palette.glow} opacity="0.35" />
              <ellipse
                rx={lantern.size * 0.4}
                ry={lantern.size * 0.98}
                fill="none"
                stroke="#fff"
                strokeOpacity="0.2"
                strokeWidth="0.5"
              />
              <rect
                x={-lantern.size * 0.42}
                y={-lantern.size - 1}
                width={lantern.size * 0.84}
                height="1.6"
                rx="0.5"
                fill={palette.ground}
                opacity="0.85"
              />
              <rect
                x={-lantern.size * 0.42}
                y={lantern.size - 0.6}
                width={lantern.size * 0.84}
                height="1.6"
                rx="0.5"
                fill={palette.ground}
                opacity="0.85"
              />
              <line
                y1={lantern.size + 1}
                y2={lantern.size + 1 + lantern.size * 0.55}
                stroke={palette.lantern}
                strokeWidth="0.7"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>
      ))}

      <path d={scene.front.path} fill={palette.ground} />
      {scene.front.counters.map((counter, index) => (
        <rect
          key={index}
          x={counter.x}
          y={counter.y}
          width={counter.w}
          height={counter.h}
          rx={Math.min(1.5, counter.h / 2)}
          fill={palette.glow}
          opacity={0.55 + (index % 3) * 0.12}
        />
      ))}
    </svg>
  );
}
