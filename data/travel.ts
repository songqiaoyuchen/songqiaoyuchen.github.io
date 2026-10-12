// Travel content: real trips in real places, oldest first. Every trip has an introduction; recorded tracks, stops,
// galleries and stories are each optional. A trip's stops are its places of note, each a named marker with the trip
// open. Galleries and stories carry their own dates. Facts marked
// placeholder are invented until the real data arrives. A gallery's photos are a folder,
// public/travel/photos/<trip>/<gallery>/, read into travelPhotos.json by `npm run sync:travel-photos`.
import {formatEntryStart} from './about';
import TRAVEL_PHOTOS from './travelPhotos.json';

/** Degrees, longitude first (east positive), latitude second (north positive). */
export type LonLat = readonly [number, number];

export type TravelMode = 'bicycle' | 'hike' | 'train' | 'flight';

/** A trip's own marker on the globe in place of the diamond (components/scene/travel/TripIcon.tsx). */
export type TripIcon = 'ventoux' | 'hairpins';

/** A gallery's photo and its text, from its folder (galleryPhotos). */
export type GalleryPhoto = {src: string; width: number; height: number; text: string};

/** A dated set of photos, each with its text; its photos are the folder named by its id under the trip's. */
export type Gallery = {
  id: string;
  title: string;
  /** First day as YYYY-MM-DD. */
  start: string;
  days?: number;
};

/** A written account: a Blog article once `slug` names one, a placeholder until then. */
export type Story = {title: string; date: string; slug?: string};

/** A place of note on a trip: a marker named on hover. */
export type TripStop = {id: string; name: string; lonLat: LonLat};

export type Trip = {
  id: string;
  title: string;
  /** First day as YYYY-MM-DD; trips are listed by it, oldest first. Shown only for a trip with a mode. */
  start: string;
  days?: number;
  distanceKm?: number;
  /** How the trip was travelled; a city visit has none, and shows no dates (its galleries and stories carry them). */
  mode?: TravelMode;
  /** The place the marker stands on and the globe turns to; the start of a long route. */
  place: {name: string; lonLat: LonLat};
  /** Its own marker in place of the diamond. */
  icon?: TripIcon;
  summary: string;
  description: string;
  /**
   * Recorded tracks, each a run of places in order. Recordings break, so one trip may hold several;
   * the straight gap from one track's end to the next one's start is drawn dotted.
   */
  segments?: readonly (readonly LonLat[])[];
  /** Places of note, in the order visited; nothing is drawn between them but the trip's own tracks. */
  stops?: readonly TripStop[];
  galleries?: readonly Gallery[];
  stories?: readonly Story[];
};

export const TRIPS: readonly Trip[] = [
  {
    id: 'g318',
    title: 'G318, Chengdu to Lhasa',
    start: '2026-05-14',
    days: 30,
    distanceKm: 2150, // placeholder
    mode: 'bicycle',
    place: {name: 'Chengdu, Sichuan', lonLat: [104.07, 30.67]},
    summary: 'The Sichuan–Tibet highway over the Hengduan ranges, by bicycle.',
    description: 'Placeholder. Two recordings that do not meet: the first from Chengdu over the first passes, the '
      + 'second from the Nyingchi side into Lhasa. The gap between them is drawn dotted until the missing days are '
      + 'recovered. Distance is a placeholder.',
    // Placeholder tracks traced from town to town; the real GPX recordings replace them.
    segments: [
      [[104.07, 30.67], [102.99, 29.98], [101.96, 30.05], [101.49, 30.05], [100.27, 30.0]],
      [[96.77, 29.5], [95.77, 29.86], [94.36, 29.65], [92.7, 29.9], [91.13, 29.65]],
    ],
    stops: [
      {id: 'chengdu', name: 'Chengdu', lonLat: [104.07, 30.67]},
      {id: 'xinduqiao', name: 'Xinduqiao', lonLat: [101.49, 30.05]},
      {id: 'litang', name: 'Litang', lonLat: [100.27, 30.0]},
      {id: 'markam', name: 'Markam', lonLat: [98.59, 29.68]},
      {id: 'rawu', name: 'Rawu', lonLat: [96.77, 29.5]},
      {id: 'nyingchi', name: 'Nyingchi', lonLat: [94.36, 29.65]},
      {id: 'lhasa', name: 'Lhasa', lonLat: [91.13, 29.65]},
    ],
    galleries: [
      {id: 'sichuan', title: 'Placeholder: Sichuan', start: '2026-05-14', days: 12},
      {id: 'tibet', title: 'Placeholder: Tibet', start: '2026-05-26', days: 18},
    ],
    stories: [{title: 'Placeholder: the road to Lhasa', date: '2026-06-12'}],
  },
  {
    id: 'triple-crown',
    title: 'The Triple Crown',
    start: '2026-08-21',
    days: 6,
    mode: 'hike',
    place: {name: 'Rogaland and Vestland, Norway', lonLat: [6.19, 58.99]},
    summary: 'Three of western Norway’s classic hikes, between Stavanger and Bergen.',
    description: 'Placeholder. Preikestolen, Kjeragbolten and Trolltunga, each its own hike, with Stavanger and '
      + 'Bergen on either side.',
    stops: [
      {id: 'stavanger', name: 'Stavanger', lonLat: [5.73, 58.97]},
      {id: 'preikestolen', name: 'Preikestolen', lonLat: [6.19, 58.99]},
      {id: 'kjeragbolten', name: 'Kjeragbolten', lonLat: [6.58, 59.03]},
      {id: 'trolltunga', name: 'Trolltunga', lonLat: [6.74, 60.12]},
      {id: 'bergen', name: 'Bergen', lonLat: [5.32, 60.39]},
    ],
  },
  {
    id: 'london',
    title: 'London',
    start: '2026-09-20',
    place: {name: 'London, England', lonLat: [-0.13, 51.51]},
    summary: 'Placeholder. Two days in London.',
    description: 'Placeholder.',
  },
  {
    id: 'marseille',
    title: 'Marseille',
    start: '2026-09-22',
    place: {name: 'Marseille, Provence', lonLat: [5.37, 43.3]},
    summary: 'Placeholder. The old port and the calanques.',
    description: 'Placeholder.',
    galleries: [
      {id: 'city', title: 'Placeholder: Marseille', start: '2026-09-22', days: 2},
    ],
  },
  {
    id: 'mont-ventoux',
    title: 'Mont Ventoux',
    start: '2026-09-24',
    days: 1,
    distanceKm: 21, // placeholder: Bédoin to the summit
    mode: 'bicycle',
    place: {name: 'Mont Ventoux, Provence', lonLat: [5.279, 44.174]},
    icon: 'ventoux',
    summary: 'The bald mountain of Provence, climbed from Bédoin.',
    description: 'Placeholder. A single day, a single climb: the forest, then the moonscape above Chalet Reynard, '
      + 'then the tower. Distance is a placeholder until the ride is written up.',
  },
  {
    id: 'alpe-dhuez',
    title: 'Alpe d’Huez',
    start: '2026-09-26',
    days: 1,
    distanceKm: 14, // placeholder: Le Bourg-d'Oisans to the top
    mode: 'bicycle',
    place: {name: 'Alpe d’Huez, Isère', lonLat: [6.07, 45.09]},
    icon: 'hairpins',
    summary: 'Placeholder. The twenty-one hairpins from Le Bourg-d’Oisans.',
    description: 'Placeholder.',
  },
  {
    id: 'zurich',
    title: 'Zurich',
    start: '2026-09-27',
    place: {name: 'Zurich, Switzerland', lonLat: [8.54, 47.37]},
    summary: 'Placeholder. A day by the lake.',
    description: 'Placeholder.',
  },
];

export function getTrip(id: string | undefined) {
  return TRIPS.find((trip) => trip.id === id);
}

const PHOTOS: Readonly<Record<string, readonly GalleryPhoto[]>> = TRAVEL_PHOTOS;

/** A gallery's photos, from public/travel/photos/<trip>/<gallery>/; none until the folder has some. */
export function galleryPhotos(trip: Trip, gallery: Gallery) {
  return PHOTOS[`${trip.id}/${gallery.id}`] ?? [];
}

const MODE_LABELS: Record<TravelMode, string> = {
  bicycle: 'ride',
  hike: 'hike',
  train: 'train',
  flight: 'flight',
};

/** "Jun 2025 · 14 days · 2,150 km · ride"; parts a trip lacks are left out, a city visit's dates too. */
export function formatTripMeta(trip: Trip) {
  if (!trip.mode) return 'City';
  const parts = [formatEntryStart(trip.start.slice(0, 7))];
  if (trip.days) parts.push(trip.days === 1 ? '1 day' : `${trip.days} days`);
  if (trip.distanceKm) parts.push(`${trip.distanceKm.toLocaleString('en')} km`);
  parts.push(MODE_LABELS[trip.mode]);
  return parts.join(' · ');
}

const DAY_MS = 86_400_000;

/** "22 – 23 Sep 2026", "14 May – 12 Jun 2026" or "24 Sep 2026" for a gallery or story. */
export function formatDays(start: string, days = 1) {
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(first.getTime() + (days - 1) * DAY_MS);
  const day = (date: Date, options: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString('en-GB', {timeZone: 'UTC', ...options});
  const full = {day: 'numeric', month: 'short', year: 'numeric'} as const;
  if (days <= 1) return day(first, full);
  const sameMonth = first.getUTCMonth() === last.getUTCMonth() && first.getUTCFullYear() === last.getUTCFullYear();
  const from = sameMonth ? day(first, {day: 'numeric'}) : day(first, {day: 'numeric', month: 'short'});
  return `${from} – ${day(last, full)}`;
}

/** "2024 – 2025" for the trip index heading, or the single year. */
export function formatTripYears(trips: readonly Trip[]) {
  const years = trips.map((trip) => trip.start.slice(0, 4));
  const first = years[0];
  const last = years[years.length - 1];
  return first === last ? first : `${first} – ${last}`;
}
