// Location index on the Places overview: every location, as the guaranteed way to places on the globe's far side. Its
// meridian strip lays the globe's turn flat (MeridianStrip), and the list runs west to east, the order locations come
// round as the globe turns, each with its coordinates. On desktop it is a right-hand drawer like About's
// (backdrop, title). On phones, where the whole globe stands above it, it is a peek sheet: the location in the globe's
// focus (or the last one) and a pull for the list, which the camera steps back for (indexOpen); a sideways swipe on the
// peek steps to the next location west to east, or back, and the globe turns it to its centre. Hovering a row
// highlights its marker; the location in the globe's focus lights up, and the locations on its far side dim.
'use client';

import Link from 'next/link';
import {
  useMemo, useRef, useState, type CSSProperties, type MouseEvent, type MutableRefObject, type PointerEvent,
} from 'react';
import {panelStyles} from '@/components/home/drawer/Drawer.styles';
import {formatLocationMeta, type LonLat, type Location} from '@/data/places';
import {MeridianStrip} from './MeridianStrip';
import type {GlobeFront} from './PlacesSceneContext';

type LocationIndexProps = {
  locations: readonly Location[];
  hoveredId: string | null;
  capturedId: string | null;
  globeFront: MutableRefObject<GlobeFront | null>;
  onHover: (id: string | null) => void;
  /** Phones: the list pulled up over the peek. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Phones: a swipe on the peek asks the globe to turn this location to its centre. */
  onTurnTo: (id: string) => void;
};

// Pixels a vertical swipe on the peek's bar travels before it pulls the list up or lets it down, and a sideways swipe
// on the peek's location before it steps to the next one.
const SWIPE = 24;

const degrees = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(1)}° ${value >= 0 ? positive : negative}`;

function Coordinates({lonLat: [lon, lat], className}: {lonLat: LonLat; className?: string}) {
  return (
    <span className={`places-index-coord ${className ?? ''}`}>
      <span>{degrees(lat, 'N', 'S')}</span>
      <span>{degrees(lon, 'E', 'W')}</span>
    </span>
  );
}

export function LocationIndex({
  locations, hoveredId, capturedId, globeFront, onHover, open, onOpenChange, onTurnTo,
}: LocationIndexProps) {
  const westToEast = useMemo(() => [...locations].sort((a, b) => a.place.lonLat[0] - b.place.lonLat[0]), [locations]);
  const [far, setFar] = useState<ReadonlySet<string>>(() => new Set());
  // The peek shows the location in focus, or the last one while the globe turns between locations (the globe opens on
  // the newest).
  // A swipe shows the next location at once; the peek takes up the focus again only when it changes, so the location
  // still in focus as the globe starts its turn does not take the peek back.
  const [peekId, setPeekId] = useState(locations[locations.length - 1]?.id ?? null);
  const [shownCapture, setShownCapture] = useState(capturedId);
  if (capturedId !== shownCapture) {
    setShownCapture(capturedId);
    if (capturedId) setPeekId(capturedId);
  }
  const peek = locations.find((location) => location.id === peekId);
  const swipe = useRef<number | null>(null);
  // The peek's sideways swipe: where it began, whether the last one stepped (its click then opens nothing), and the
  // way the location it stepped to slides in from (1 from the right, -1 from the left).
  const stepSwipe = useRef<{x: number; y: number} | null>(null);
  const stepped = useRef(false);
  const [slide, setSlide] = useState<{id: string; from: number} | null>(null);

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
  function handleStepStart(event: PointerEvent) {
    stepSwipe.current = {x: event.clientX, y: event.clientY};
    stepped.current = false;
  }
  function handleStepEnd(event: PointerEvent) {
    if (!stepSwipe.current || !peek) return;
    const dx = event.clientX - stepSwipe.current.x;
    const dy = event.clientY - stepSwipe.current.y;
    stepSwipe.current = null;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy)) return;
    // Swiping left brings the next location east, as the map reads.
    const step = dx < 0 ? 1 : -1;
    const current = westToEast.findIndex((location) => location.id === peek.id);
    const next = westToEast[(current + step + westToEast.length) % westToEast.length];
    stepped.current = true;
    setPeekId(next.id);
    setSlide({id: next.id, from: step});
    onTurnTo(next.id);
  }
  function handleStepClick(event: MouseEvent) {
    if (!stepped.current) return;
    stepped.current = false;
    event.preventDefault();
  }
  const slideClass = slide?.id === peek?.id ? 'places-peek-slide' : undefined;

  return (
    <>
      <div aria-hidden="true" className="places-index-backdrop about-backdrop" />
      <nav aria-labelledby="places-index-title" className="places-index" data-open={open || undefined}>
        <div className={`places-index-body ${panelStyles.content}`}>
          <header className="places-index-entry places-index-head mb-6">
            <h2 className={panelStyles.title} id="places-index-title">Places</h2>
          </header>
          <div className="places-index-entry places-index-strip mb-6" style={{'--rise': 1} as CSSProperties}>
            <MeridianStrip
              capturedId={capturedId}
              globeFront={globeFront}
              hoveredId={hoveredId}
              onFar={setFar}
              locations={locations}
            />
          </div>
          {/* Phones: the bar pulls the list up or lets it down, by tap or by a swipe. */}
          <div
            className="places-index-entry places-peek-bar"
            onPointerCancel={() => { swipe.current = null; }}
            onPointerDown={handleSwipeStart}
            onPointerUp={handleSwipeEnd}
          >
            <button
              aria-hidden="true"
              className="places-peek-handle"
              onClick={() => onOpenChange(!open)}
              tabIndex={-1}
              type="button"
            />
            <button
              aria-controls="places-index-list"
              aria-expanded={open}
              className="places-peek-toggle"
              onClick={() => onOpenChange(!open)}
              type="button"
            >
              {open ? 'Close' : 'All places'} <span aria-hidden="true">{open ? '↓' : '↑'}</span>
            </button>
          </div>
          {peek ? (
            <Link
              className={`places-index-entry places-peek-location group/location ${panelStyles.focusRing}`}
              data-captured={capturedId === peek.id || undefined}
              href={`/places/${peek.id}`}
              onClickCapture={handleStepClick}
              onPointerCancel={() => { stepSwipe.current = null; }}
              onPointerDown={handleStepStart}
              onPointerUp={handleStepEnd}
              style={{'--rise': 1, '--slide-from': slide?.from ?? 0} as CSSProperties}
            >
              <Coordinates className={slideClass} key={`coord-${peek.id}`} lonLat={peek.place.lonLat} />
              <span className={`min-w-0 ${slideClass ?? ''}`} key={`title-${peek.id}`}>
                <span className="places-peek-title">{peek.title}</span>
                <span className="mt-1 block font-mono text-micro uppercase tracking-meta text-muted-soft">
                  {formatLocationMeta(peek)}
                </span>
              </span>
              <span aria-hidden="true" className="places-peek-cue">→</span>
            </Link>
          ) : null}
          {/* The dividers belong to the rows, which fade in: a line on the list itself would stand before them. */}
          <ol className="places-index-list m-0 list-none p-0" id="places-index-list">
            {westToEast.map((location, index) => (
              <li
                className="places-index-entry border-b border-line first:border-t"
                key={location.id}
                style={{'--rise': index + 2} as CSSProperties}
              >
                <Link
                  className={`places-index-row group/location grid min-h-11 grid-cols-[5.5rem_minmax(0,1fr)]
                    items-baseline
                    gap-x-5 px-3 py-4 transition-[background-color,opacity] duration-interaction
                    hover:bg-surface-soft data-hovered:bg-surface-soft ${panelStyles.focusRing}`}
                  data-captured={capturedId === location.id || undefined}
                  data-far={far.has(location.id) || undefined}
                  data-hovered={hoveredId === location.id || undefined}
                  href={`/places/${location.id}`}
                  onBlur={() => onHover(null)}
                  onFocus={() => onHover(location.id)}
                  onPointerEnter={() => onHover(location.id)}
                  onPointerLeave={() => onHover(null)}
                >
                  <Coordinates lonLat={location.place.lonLat} />
                  <span className="min-w-0">
                    <span className="block font-serif text-card italic leading-snug text-text transition-colors
                      duration-interaction group-hover/location:text-accent group-data-hovered/location:text-accent
                      group-data-captured/location:text-accent">
                      {location.title}
                    </span>
                    <span className="mt-1 block font-mono text-micro uppercase tracking-meta text-muted-soft">
                      {formatLocationMeta(location)}
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
