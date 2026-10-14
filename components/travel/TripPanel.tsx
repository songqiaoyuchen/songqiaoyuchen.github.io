// A selected trip's panel: meta line, title, place, introduction and description; then, when the trip has them,
// its galleries (each its title and photo count over a strip of its photos, a gap between days, each opening the
// viewer there; or a note while its folder is empty) and stories.
// "All trips", the return to the overview, leads it as an article's back link does, so it is always in view.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {BackLink} from '@/components/site/BackLink';
import {formatDay, formatTripMeta, galleryPhotos, photoAlt, type Trip} from '@/data/travel';
import {TripDescription} from './TripDescription';

export function TripPanel({trip}: {trip: Trip}) {
  const tripHref = `/travel/${trip.id}`;
  let order = 0;
  const rise = () => ({'--rise': order++} as CSSProperties);

  return (
    <article aria-labelledby="trip-title" className="travel-trip" key={trip.id}>
      <BackLink className="travel-back" href="/travel" style={rise()}>All trips</BackLink>
      <p className="travel-eyebrow" style={rise()}>{formatTripMeta(trip)}</p>
      <h2 className="travel-trip-title" id="trip-title" style={rise()}>{trip.title}</h2>
      <p className="travel-trip-place" style={rise()}>{trip.place.name}</p>
      <p className="travel-trip-summary" style={rise()}>{trip.summary}</p>
      <TripDescription chinese={trip.descriptionZh} style={rise()} text={trip.description} />
      {trip.galleries?.map((gallery) => {
        const photos = galleryPhotos(trip, gallery);
        return (
          <section aria-label={gallery.title} className="travel-gallery" key={gallery.id} style={rise()}>
            <div className="travel-gallery-head">
              <p>{gallery.title}</p>
              {photos.length ? (
                <Link className="travel-link" href={`${tripHref}?gallery=${gallery.id}&photo=0`} scroll={false}>
                  {photos.length === 1 ? '1 photo' : `${photos.length} photos`} <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>
            {photos.length ? (
              <ul className="travel-photos">
                {photos.map((photo, index) => (
                  <li data-new-day={(index && photo.date !== photos[index - 1].date) || undefined} key={photo.src}>
                    <Link href={`${tripHref}?gallery=${gallery.id}&photo=${index}`} scroll={false}>
                      <Image
                        alt={photoAlt(gallery, photo)}
                        height={photo.height}
                        sizes="160px"
                        src={photo.thumb}
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
          {story.title} · {formatDay(story.date)} <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className="travel-link travel-story" data-pending="" key={story.title} style={rise()}>
          {story.title} · {formatDay(story.date)} · in writing
        </p>
      ))}
    </article>
  );
}
