// Reads the Travel URL: the selected trip (/travel/[trip]) and the open photo (?gallery=<id>&photo=<index>).
'use client';

import {usePathname} from 'next/navigation';
import {galleryPhotos, getTrip} from '@/data/travel';

/** The trip the route opens (/travel/[trip]); undefined over all trips and outside Travel. */
export function useRouteTrip() {
  const segments = usePathname().replace(/\/+$/, '').split('/').filter(Boolean);
  return segments[0] === 'travel' ? getTrip(segments[1]) : undefined;
}

export function useTravelRoute(queryString: string) {
  const trip = useRouteTrip();
  const query = new URLSearchParams(queryString);
  const gallery = trip?.galleries?.find((candidate) => candidate.id === query.get('gallery'));
  const raw = query.get('photo');
  const index = raw === null ? Number.NaN : Number(raw);
  const photos = trip && gallery ? galleryPhotos(trip, gallery) : [];
  const photo = Number.isInteger(index) && index >= 0 && index < photos.length ? index : -1;
  const tripHref = trip ? `/travel/${trip.id}` : '/travel';
  return {trip, gallery, photos, photo, tripHref};
}
