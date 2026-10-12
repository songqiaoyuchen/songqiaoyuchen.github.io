// A selected trip's panel: meta line, title, place, introduction and description; then, when the trip has them,
// its galleries (each a dated row of photos opening the viewer, or a note while its folder is empty) and stories.
// "All trips" is the local return to the overview.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {formatDays, formatTripMeta, galleryPhotos, type Trip} from '@/data/travel';

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
      {trip.galleries?.map((gallery) => {
        const photos = galleryPhotos(trip, gallery);
        return (
          <section aria-label={gallery.title} className="travel-gallery" key={gallery.id} style={rise()}>
            <p className="travel-gallery-head">
              <span>{gallery.title}</span>
              <span className="travel-gallery-date">{formatDays(gallery.start, gallery.days)}</span>
            </p>
            {photos.length ? (
              <ul className="travel-photos">
                {photos.map((photo, index) => (
                  <li key={photo.src}>
                    <Link href={`${tripHref}?gallery=${gallery.id}&photo=${index}`} scroll={false}>
                      <Image
                        alt={photo.text || `${gallery.title}, photo ${index + 1}`}
                        height={photo.height}
                        sizes="120px"
                        src={photo.src}
                        width={photo.width}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="travel-gallery-empty">Photos to come</p>}
          </section>
        );
      })}
      {trip.stories?.map((story) => story.slug ? (
        <Link className="travel-link travel-story" href={`/blog/${story.slug}`} key={story.title} style={rise()}>
          {story.title} · {formatDays(story.date)} <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className="travel-link travel-story" data-pending="" key={story.title} style={rise()}>
          {story.title} · {formatDays(story.date)} · in writing
        </p>
      ))}
      <Link className="travel-back" href="/travel" style={rise()}>
        <span aria-hidden="true">←</span> All trips
      </Link>
    </article>
  );
}
