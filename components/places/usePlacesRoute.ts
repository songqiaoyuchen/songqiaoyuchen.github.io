// Reads the Places URL: the selected location (/places/[location]), the open photo (?gallery=<id>&photo=<index>) and
// whether it is inspected (&inspect=1).
'use client';

import {usePathname} from 'next/navigation';
import {galleryPhotos, getLocation} from '@/data/places';

/** The location the route opens (/places/[location]); undefined over all locations and outside Places. */
export function useRouteLocation() {
  const segments = usePathname().replace(/\/+$/, '').split('/').filter(Boolean);
  return segments[0] === 'places' ? getLocation(segments[1]) : undefined;
}

export function usePlacesRoute(queryString: string) {
  const location = useRouteLocation();
  const query = new URLSearchParams(queryString);
  const gallery = location?.galleries?.find((candidate) => candidate.id === query.get('gallery'));
  const raw = query.get('photo');
  const index = raw === null ? Number.NaN : Number(raw);
  const photos = location && gallery ? galleryPhotos(location, gallery) : [];
  const photo = Number.isInteger(index) && index >= 0 && index < photos.length ? index : -1;
  const inspecting = photo >= 0 && query.get('inspect') === '1';
  const locationHref = location ? `/places/${location.id}` : '/places';
  /** The viewer at a photo of the open gallery, or inspecting it. */
  const photoHref = (at: number, inspect = false) =>
    `${locationHref}?gallery=${gallery?.id}&photo=${at}${inspect ? '&inspect=1' : ''}`;
  return {location, gallery, photos, photo, inspecting, locationHref, photoHref};
}
