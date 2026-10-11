// Reads the Travel URL: the selected trip (/travel/[trip]) and the open photo (?photo=<index>).
'use client';

import {usePathname} from 'next/navigation';
import {getTrip} from '@/data/travel';

/** The trip the route opens (/travel/[trip]); undefined over all trips and outside Travel. */
export function useRouteTrip() {
  const segments = usePathname().replace(/\/+$/, '').split('/').filter(Boolean);
  return segments[0] === 'travel' ? getTrip(segments[1]) : undefined;
}

export function useTravelRoute(queryString: string) {
  const trip = useRouteTrip();
  const raw = new URLSearchParams(queryString).get('photo');
  const index = raw === null ? Number.NaN : Number(raw);
  const photo = trip?.photos && Number.isInteger(index) && index >= 0 && index < trip.photos.length ? index : -1;
  const tripHref = trip ? `/travel/${trip.id}` : '/travel';
  return {trip, photo, tripHref};
}
