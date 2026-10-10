// Reads the Travel URL: the selected trip (/travel/[trip]) and the open photo (?photo=<index>).
'use client';

import {usePathname} from 'next/navigation';
import {getTrip} from '@/data/travel';

export function useTravelRoute(queryString: string) {
  const pathname = usePathname().replace(/\/+$/, '');
  const trip = getTrip(pathname.split('/').filter(Boolean)[1]);
  const raw = new URLSearchParams(queryString).get('photo');
  const index = raw === null ? Number.NaN : Number(raw);
  const photo = trip?.photos && Number.isInteger(index) && index >= 0 && index < trip.photos.length ? index : -1;
  const tripHref = trip ? `/travel/${trip.id}` : '/travel';
  return {trip, photo, tripHref};
}
