// A selected location's panel: meta line, title, place, introduction and description; then, when the location has them,
// its galleries (each its title and photo count over a strip of its photos, any with an order first and the rest by
// day with a gap between days, each opening the viewer there; or a note while its folder is empty) and stories.
// "All locations", the return to the overview, leads it as an article's back link does, so it is always in view.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {BackLink} from '@/components/site/BackLink';
import {formatDay, formatLocationMeta, galleryPhotos, photoAlt, stripPhotos, type Location} from '@/data/places';
import {LocationDescription} from './LocationDescription';

export function LocationPanel({location}: {location: Location}) {
  const locationHref = `/places/${location.id}`;
  let order = 0;
  const rise = () => ({'--rise': order++} as CSSProperties);

  return (
    <article aria-labelledby="location-title" className="places-location" key={location.id}>
      <BackLink className="places-back" href="/places" style={rise()}>All places</BackLink>
      <p className="places-eyebrow" style={rise()}>{formatLocationMeta(location)}</p>
      <h2 className="places-location-title" id="location-title" style={rise()}>{location.title}</h2>
      <p className="places-location-place" style={rise()}>{location.place.name}</p>
      <p className="places-location-summary" style={rise()}>{location.summary}</p>
      <LocationDescription chinese={location.descriptionZh} style={rise()} text={location.description} />
      {location.galleries?.map((gallery) => {
        const photos = galleryPhotos(location, gallery);
        return (
          <section aria-label={gallery.title} className="places-gallery" key={gallery.id} style={rise()}>
            <div className="places-gallery-head">
              <p>{gallery.title}</p>
              {photos.length ? (
                <Link className="places-link" href={`${locationHref}?gallery=${gallery.id}&photo=0`} scroll={false}>
                  {photos.length === 1 ? '1 photo' : `${photos.length} photos`} <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>
            {photos.length ? (
              <ul className="places-photos">
                {stripPhotos(photos).map(({photo, index, gap}) => (
                  <li data-new-day={gap || undefined} key={photo.src}>
                    <Link href={`${locationHref}?gallery=${gallery.id}&photo=${index}`} scroll={false}>
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
            ) : <p className="places-gallery-empty">Photos to come</p>}
          </section>
        );
      })}
      {location.stories?.map((story) => story.slug ? (
        <Link className="places-link places-story" href={`/blog/${story.slug}`} key={story.title} style={rise()}>
          {story.title} · {formatDay(story.date)} <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className="places-link places-story" data-pending="" key={story.title} style={rise()}>
          {story.title} · {formatDay(story.date)} · in writing
        </p>
      ))}
    </article>
  );
}
