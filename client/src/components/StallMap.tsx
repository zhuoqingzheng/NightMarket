import type { EventDetail, Stall, StallStatus, Tier } from '@night-market/shared';
import { DoorOpen } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../helpers/cn';
import { formatMoney } from '../helpers/format';
import { summariseTiers, TIERS } from '../helpers/tiers';

const AVAILABLE_TILE: Record<Tier, string> = {
  prime: 'bg-amber-100 text-amber-900/50 ring-amber-300/90 hover:bg-amber-200/70 hover:text-amber-950 hover:ring-amber-400',
  corner: 'bg-sky-100 text-sky-900/50 ring-sky-300/90 hover:bg-sky-200/70 hover:text-sky-950 hover:ring-sky-400',
  standard: 'bg-white text-stone-400 ring-stone-300 hover:bg-stone-50 hover:text-stone-700 hover:ring-stone-400',
};

/** Ids of stalls another merchant has just taken, so the map can flash them for a moment. */
function useNewlyTaken(stalls: Stall[]): ReadonlySet<number> {
  const previous = useRef<Map<number, StallStatus> | null>(null);
  const [flashing, setFlashing] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => {
    const before = previous.current;
    previous.current = new Map(stalls.map((stall) => [stall.id, stall.status]));
    if (!before) return;
    const taken = stalls.filter((stall) => stall.status === 'taken' && before.get(stall.id) === 'available');
    if (taken.length > 0) setFlashing((current) => new Set([...current, ...taken.map((stall) => stall.id)]));
  }, [stalls]);

  useEffect(() => {
    if (flashing.size === 0) return;
    const timer = window.setTimeout(() => setFlashing(new Set()), 1800);
    return () => window.clearTimeout(timer);
  }, [flashing]);

  return flashing;
}

interface GridLayout {
  /** CSS grid-template-columns, with a track for row letters at each end. */
  columns: string;
  /** CSS grid-template-rows. */
  rows: string;
  rowLetters: Array<[row: number, letter: string]>;
}

/** Grid tracks for the plan: rows and columns without any stalls render as narrow walkways. */
function useGridLayout({
  stalls,
  centerpiece,
  gridRows,
  gridCols,
}: Pick<EventDetail, 'stalls' | 'centerpiece' | 'gridRows' | 'gridCols'>): GridLayout {
  return useMemo(() => {
    const usedRows = new Set<number>();
    const usedCols = new Set<number>();
    const rowLetters = new Map<number, string>();

    for (const stall of stalls) {
      usedRows.add(stall.row);
      usedCols.add(stall.col);
      if (!rowLetters.has(stall.row)) rowLetters.set(stall.row, stall.label.replace(/\d+$/, ''));
    }
    if (centerpiece) {
      for (let row = centerpiece.row; row < centerpiece.row + centerpiece.rowSpan; row++) usedRows.add(row);
      for (let col = centerpiece.col; col < centerpiece.col + centerpiece.colSpan; col++) usedCols.add(col);
    }

    const columns = Array.from({ length: gridCols }, (_, col) => (usedCols.has(col) ? 'var(--cell-w)' : 'var(--aisle)'));
    const rows = Array.from({ length: gridRows }, (_, row) => (usedRows.has(row) ? 'var(--cell-h)' : 'var(--aisle)'));

    return {
      columns: ['var(--label)', ...columns, 'var(--label)'].join(' '),
      rows: rows.join(' '),
      rowLetters: [...rowLetters],
    };
  }, [stalls, centerpiece, gridRows, gridCols]);
}

interface StallMapProps {
  event: EventDetail;
  selectedId: number | null;
  onSelect: (stall: Stall) => void;
  interactive?: boolean;
  className?: string;
}

export function StallMap({ event, selectedId, onSelect, interactive = true, className }: StallMapProps) {
  const flashing = useNewlyTaken(event.stalls);
  const layout = useGridLayout(event);
  const { centerpiece } = event;
  const frame = useRef<HTMLDivElement>(null);

  // On narrow screens the plan scrolls sideways; open it centred on the stage rather than at the left edge.
  useLayoutEffect(() => {
    const element = frame.current;
    if (element) element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2;
  }, []);

  return (
    <div
      ref={frame}
      className={cn(
        'dot-grid overflow-x-auto rounded-xl bg-stone-50/80 px-4 pb-6 pt-7 ring-1 ring-inset ring-stone-900/[0.05] sm:px-6',
        className,
      )}
    >
      {/* Shrink-to-fit: the plan fills the frame when it can, and scrolls sideways only when it must. */}
      <div className="mx-auto w-fit">
        <Landmark label={event.mapTop} />

        <div
          role="group"
          aria-label="Floor plan"
          className="mt-8 grid gap-[5px] [--aisle:minmax(0.5rem,0.875rem)] [--cell-h:2rem] [--cell-w:minmax(1.75rem,2.25rem)] [--label:1.25rem]"
          style={{ gridTemplateColumns: layout.columns, gridTemplateRows: layout.rows }}
        >
          {layout.rowLetters.map(([row, letter]) => (
            <Fragment key={row}>
              <RowLetter row={row} col={1} letter={letter} />
              <RowLetter row={row} col={event.gridCols + 2} letter={letter} />
            </Fragment>
          ))}

          {centerpiece && (
            <div
              style={{
                gridRow: `${centerpiece.row + 1} / span ${centerpiece.rowSpan}`,
                gridColumn: `${centerpiece.col + 2} / span ${centerpiece.colSpan}`,
              }}
              className="flex items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/70 px-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400"
            >
              {centerpiece.label}
            </div>
          )}

          {event.stalls.map((stall) => (
            <StallTile
              key={stall.id}
              stall={stall}
              selected={stall.id === selectedId}
              flashing={flashing.has(stall.id)}
              interactive={interactive}
              onSelect={onSelect}
            />
          ))}
        </div>

        <Entrance label={event.mapBottom} />
      </div>
    </div>
  );
}

function tileState(stall: Stall, selected: boolean, clickable: boolean): string {
  if (selected) return 'z-10 scale-110 bg-stone-900 text-white ring-stone-900 shadow-md shadow-stone-900/25';
  if (stall.status === 'mine') return 'bg-lantern-500 text-white ring-lantern-600/50 outline-3 outline-lantern-500/20';
  if (stall.status === 'taken') return 'stripes bg-stone-100/80 text-transparent ring-stone-200';
  return cn(AVAILABLE_TILE[stall.tier], clickable && 'hover:-translate-y-px hover:shadow-sm');
}

interface StallTileProps {
  stall: Stall;
  selected: boolean;
  /** Briefly highlights a stall that another merchant has just taken. */
  flashing: boolean;
  interactive: boolean;
  onSelect: (stall: Stall) => void;
}

function StallTile({ stall, selected, flashing, interactive, onSelect }: StallTileProps) {
  const clickable = interactive && stall.status !== 'taken';
  const summary =
    stall.status === 'taken'
      ? 'Taken'
      : stall.status === 'mine'
        ? 'Your stall'
        : `${TIERS[stall.tier].name} · ${formatMoney(stall.priceCents)}`;

  return (
    <button
      type="button"
      aria-label={`Stall ${stall.label}, ${summary}`}
      aria-pressed={stall.status === 'available' ? selected : undefined}
      aria-disabled={clickable ? undefined : true}
      onClick={() => clickable && onSelect(stall)}
      style={{ gridRow: stall.row + 1, gridColumn: stall.col + 2 }}
      className={cn(
        'group/stall relative rounded-[7px] text-[10px] font-semibold tabular-nums ring-1 ring-inset transition duration-150 hover:z-20 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lantern-500',
        tileState(stall, selected, clickable),
        clickable ? 'cursor-pointer' : 'cursor-default',
        flashing && 'animate-taken',
      )}
    >
      {stall.label.replace(/^\D+/, '')}
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition duration-150 group-hover/stall:translate-y-0 group-hover/stall:opacity-100 group-focus-visible/stall:translate-y-0 group-focus-visible/stall:opacity-100">
        <span className="font-semibold">{stall.label}</span>
        <span className="ml-1.5 text-white/70">{summary}</span>
      </span>
    </button>
  );
}

interface RowLetterProps {
  row: number;
  col: number;
  letter: string;
}

function RowLetter({ row, col, letter }: RowLetterProps) {
  return (
    <span
      aria-hidden="true"
      style={{ gridRow: row + 1, gridColumn: col }}
      className="flex items-center justify-center text-[10px] font-semibold text-stone-400"
    >
      {letter}
    </span>
  );
}

interface MapEdgeProps {
  label: string;
}

/** The "screen" of the floor plan: whatever the stalls face at the top of the venue. */
function Landmark({ label }: MapEdgeProps) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="h-4 w-3/5 text-stone-300" aria-hidden="true">
        <path
          d="M3 14 Q150 -4 297 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">{label}</span>
    </div>
  );
}

function Entrance({ label }: MapEdgeProps) {
  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-stone-400">
      <span className="h-px w-10 bg-stone-300" />
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em]">
        <DoorOpen className="size-3.5" />
        {label}
      </span>
      <span className="h-px w-10 bg-stone-300" />
    </div>
  );
}

interface StallLegendProps {
  stalls: Stall[];
  className?: string;
}

export function StallLegend({ stalls, className }: StallLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-stone-600', className)}>
      {summariseTiers(stalls).map(({ tier, priceCents }) => (
        <span key={tier} className="inline-flex items-center gap-2">
          <span className={cn('size-3.5 rounded-[4px] ring-1 ring-inset', TIERS[tier].swatch)} />
          {TIERS[tier].name}
          <span className="tabular-nums text-stone-400">{formatMoney(priceCents)}</span>
        </span>
      ))}
      <span aria-hidden="true" className="hidden h-3.5 w-px bg-stone-200 sm:block" />
      <LegendSwatch className="bg-stone-900 ring-stone-900" label="Selected" />
      <LegendSwatch className="bg-lantern-500 ring-lantern-600/50" label="Yours" />
      <LegendSwatch className="stripes bg-stone-100 ring-stone-200" label="Taken" />
    </div>
  );
}

interface LegendSwatchProps {
  label: string;
  className: string;
}

function LegendSwatch({ className, label }: LegendSwatchProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('size-3.5 rounded-[4px] ring-1 ring-inset', className)} />
      {label}
    </span>
  );
}
