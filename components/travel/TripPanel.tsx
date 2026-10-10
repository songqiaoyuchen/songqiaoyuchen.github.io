// A selected trip's panel: meta line, title, place, introduction and description; then, when the trip has them,
// its photos (opening the viewer) and the link to its story. "All trips" is the local return to the overview.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {formatTripMeta, type Trip} from '@/data/travel';

export function TripPanel({trip}: {trip: Trip}) {
  const tripHref = `/travel/${trip.id}`;
  let order = 0;
  const rise = () => ({'--rise': order++} as CSSProperties);

  return (
    <article aria-labelledby="trip-title" className="travel-trip" key={trip.id}>
      <p className="travel-eyebrow" style={rise()}>{formatTripMeta(trip)}</p>
      <h2 className="travel-trip-title" id="trip-title" style={rise()}>{trip.title}</h2>
      <p className="travel-trip-place" style={rise()}>{trip.place.name}</p>
      <p className="travel-trip-summary" style={rise()}>{trip.summary}</p>
      <p className="travel-trip-description" style={rise()}>{trip.description}</p>
      {trip.photos?.length ? (
        <ul aria-label="Photos" className="travel-photos" style={rise()}>
          {trip.photos.map((photo, index) => (
            <li key={photo.src}>
              <Link href={`${tripHref}?photo=${index}`} scroll={false}>
                <Image alt={photo.alt} height={photo.height} sizes="120px" src={photo.src} width={photo.width} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {trip.articleSlug ? (
        <Link className="travel-link" href={`/blog/${trip.articleSlug}`} style={rise()}>
          Read the story <span aria-hidden="true">→</span>
        </Link>
      ) : null}
      <Link className="travel-back" href="/travel" style={rise()}>
        <span aria-hidden="true">←</span> All trips
      </Link>
    </article>
  );
}
