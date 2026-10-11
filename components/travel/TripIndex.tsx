// Trip index on the Travel overview: every trip, as the guaranteed way to places on the globe's far side. Its
// meridian strip lays the globe's turn flat (MeridianStrip), and the list runs west to east, the order trips come
// round as the globe turns, each with its coordinates. On desktop it is a right-hand drawer like About's
// (backdrop, title). On phones, where the whole globe stands above it, it is a peek sheet: the trip in the globe's
// focus (or the last one) and a pull for the list, which the camera steps back for (indexOpen). Hovering a row
// highlights its marker; the trip in the globe's focus lights up, and the trips on its far side dim.
'use client';

import Link from 'next/link';
import {useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type PointerEvent} from 'react';
import {panelStyles} from '@/components/home/drawer/Drawer.styles';
import {formatTripMeta, formatTripYears, type LonLat, type Trip} from '@/data/travel';
import {MeridianStrip} from './MeridianStrip';
import type {GlobeFront} from './TravelSceneContext';

type TripIndexProps = {
  trips: readonly Trip[];
  hoveredId: string | null;
  capturedId: string | null;
  globeFront: MutableRefObject<GlobeFront | null>;
  onHover: (id: string | null) => void;
  /** Phones: the list pulled up over the peek. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Pixels a vertical swipe on the peek's bar travels before it pulls the list up or lets it down.
const SWIPE = 24;

const degrees = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(1)}° ${value >= 0 ? positive : negative}`;

function Coordinates({lonLat: [lon, lat]}: {lonLat: LonLat}) {
  return (
    <span className="travel-index-coord">
      <span>{degrees(lat, 'N', 'S')}</span>
      <span>{degrees(lon, 'E', 'W')}</span>
    </span>
  );
}

export function TripIndex({trips, hoveredId, capturedId, globeFront, onHover, open, onOpenChange}: TripIndexProps) {
  const westToEast = useMemo(() => [...trips].sort((a, b) => a.place.lonLat[0] - b.place.lonLat[0]), [trips]);
  const [far, setFar] = useState<ReadonlySet<string>>(() => new Set());
  // The peek shows the trip in focus, or the last one while the globe turns between trips (the globe opens on the
  // newest).
  const [peekId, setPeekId] = useState(trips[trips.length - 1]?.id ?? null);
  if (capturedId && capturedId !== peekId) setPeekId(capturedId);
  const peek = trips.find((trip) => trip.id === peekId);
  const swipe = useRef<number | null>(null);
  const summary = `${trips.length === 1 ? '1 trip' : `${trips.length} trips`} · ${formatTripYears(trips)}`;

  function handleSwipeStart(event: PointerEvent) {
    swipe.current = event.clientY;
  }
  function handleSwipeEnd(event: PointerEvent) {
    if (swipe.current === null) return;
    const travel = event.clientY - swipe.current;
    swipe.current = null;
    if (travel < -SWIPE) onOpenChange(true);
    else if (travel > SWIPE) onOpenChange(false);
  }

  return (
    <>
      <div aria-hidden="true" className="travel-index-backdrop about-backdrop" />
      <nav aria-labelledby="travel-index-title" className="travel-index" data-open={open || undefined}>
        <div className={`travel-index-body ${panelStyles.content}`}>
          <header className="travel-index-entry travel-index-head mb-6">
            <h2 className={panelStyles.title} id="travel-index-title">Travel</h2>
            <p className={panelStyles.intro}>{summary} · west to east</p>
          </header>
          <div className="travel-index-entry travel-index-strip mb-6" style={{'--rise': 1} as CSSProperties}>
            <MeridianStrip
              capturedId={capturedId}
              globeFront={globeFront}
              hoveredId={hoveredId}
              onFar={setFar}
              trips={trips}
            />
          </div>
          {/* Phones: the bar pulls the list up or lets it down, by tap or by a swipe. */}
          <div
            className="travel-index-entry travel-peek-bar"
            onPointerCancel={() => { swipe.current = null; }}
            onPointerDown={handleSwipeStart}
            onPointerUp={handleSwipeEnd}
          >
            <button
              aria-hidden="true"
              className="travel-peek-handle"
              onClick={() => onOpenChange(!open)}
              tabIndex={-1}
              type="button"
            />
            <p className="travel-peek-summary">{summary}</p>
            <button
              aria-controls="travel-index-list"
              aria-expanded={open}
              className="travel-peek-toggle"
              onClick={() => onOpenChange(!open)}
              type="button"
            >
              {open ? 'Close' : 'All trips'} <span aria-hidden="true">{open ? '↓' : '↑'}</span>
            </button>
          </div>
          {peek ? (
            <Link
              className={`travel-index-entry travel-peek-trip group/trip ${panelStyles.focusRing}`}
              data-captured={capturedId === peek.id || undefined}
              href={`/travel/${peek.id}`}
              style={{'--rise': 1} as CSSProperties}
            >
              <Coordinates lonLat={peek.place.lonLat} />
              <span className="min-w-0">
                <span className="travel-peek-title">{peek.title}</span>
                <span className="mt-1 block font-mono text-micro uppercase tracking-meta text-muted-soft">
                  {formatTripMeta(peek)}
                </span>
              </span>
              <span aria-hidden="true" className="travel-peek-cue">→</span>
            </Link>
          ) : null}
          <ol className="travel-index-list m-0 list-none border-t border-line p-0" id="travel-index-list">
            {westToEast.map((trip, index) => (
              <li
                className="travel-index-entry border-b border-line"
                key={trip.id}
                style={{'--rise': index + 2} as CSSProperties}
              >
                <Link
                  className={`travel-index-row group/trip grid min-h-11 grid-cols-[5.5rem_minmax(0,1fr)] items-baseline
                    gap-x-5 px-3 py-4 transition-[background-color,opacity] duration-interaction
                    hover:bg-surface-soft data-hovered:bg-surface-soft ${panelStyles.focusRing}`}
                  data-captured={capturedId === trip.id || undefined}
                  data-far={far.has(trip.id) || undefined}
                  data-hovered={hoveredId === trip.id || undefined}
                  href={`/travel/${trip.id}`}
                  onBlur={() => onHover(null)}
                  onFocus={() => onHover(trip.id)}
                  onPointerEnter={() => onHover(trip.id)}
                  onPointerLeave={() => onHover(null)}
                >
                  <Coordinates lonLat={trip.place.lonLat} />
                  <span className="min-w-0">
                    <span className="block font-serif text-card italic leading-snug text-text transition-colors
                      duration-interaction group-hover/trip:text-accent group-data-hovered/trip:text-accent
                      group-data-captured/trip:text-accent">
                      {trip.title}
                    </span>
                    <span className="mt-1 block font-mono text-micro uppercase tracking-meta text-muted-soft">
                      {formatTripMeta(trip)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
