// Trip index on the Travel overview: every trip, as the guaranteed way to places on the globe's far side. Its
// meridian strip lays the globe's turn flat (MeridianStrip), and the list runs west to east, the order trips come
// round as the globe turns, each with its coordinates. On desktop it is a right-hand drawer like About's
// (backdrop, title); on phones it fills the sheet. Hovering a row highlights its marker; the trip in the globe's
// focus lights up, and the trips on its far side dim.
'use client';

import Link from 'next/link';
import {useMemo, useState, type CSSProperties, type MutableRefObject} from 'react';
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
};

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

export function TripIndex({trips, hoveredId, capturedId, globeFront, onHover}: TripIndexProps) {
  const westToEast = useMemo(() => [...trips].sort((a, b) => a.place.lonLat[0] - b.place.lonLat[0]), [trips]);
  const [far, setFar] = useState<ReadonlySet<string>>(() => new Set());

  return (
    <>
      <div aria-hidden="true" className="travel-index-backdrop about-backdrop" />
      <nav aria-labelledby="travel-index-title" className="travel-index">
        <div className={panelStyles.content}>
          <header className="travel-index-entry mb-6">
            <h2 className={panelStyles.title} id="travel-index-title">Travel</h2>
            <p className={panelStyles.intro}>
              {trips.length === 1 ? '1 trip' : `${trips.length} trips`} · {formatTripYears(trips)} · west to east
            </p>
          </header>
          <div className="travel-index-entry mb-6" style={{'--rise': 1} as CSSProperties}>
            <MeridianStrip
              capturedId={capturedId}
              globeFront={globeFront}
              hoveredId={hoveredId}
              onFar={setFar}
              trips={trips}
            />
          </div>
          <ol className="m-0 list-none border-t border-line p-0">
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
