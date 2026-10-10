// Trip index on the Travel overview: every trip, newest first, as the guaranteed way to places on the globe's far
// side. Hovering a row highlights its marker; the row of the trip the globe rests on is marked.
'use client';

import Link from 'next/link';
import {formatTripYears, type Trip} from '@/data/travel';

type TripIndexProps = {
  trips: readonly Trip[];
  hoveredId: string | null;
  capturedId: string | null;
  onHover: (id: string | null) => void;
};

export function TripIndex({trips, hoveredId, capturedId, onHover}: TripIndexProps) {
  return (
    <nav aria-label="Trips" className="travel-index">
      <p className="travel-eyebrow">Trips · {formatTripYears(trips)}</p>
      <ol className="travel-index-list">
        {[...trips].reverse().map((trip) => (
          <li key={trip.id}>
            <Link
              className="travel-index-link"
              data-captured={capturedId === trip.id || undefined}
              data-hovered={hoveredId === trip.id || undefined}
              href={`/travel/${trip.id}`}
              onBlur={() => onHover(null)}
              onFocus={() => onHover(trip.id)}
              onPointerEnter={() => onHover(trip.id)}
              onPointerLeave={() => onHover(null)}
            >
              <span className="travel-index-year">{trip.start.slice(0, 4)}</span>
              <span className="travel-index-title">{trip.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
