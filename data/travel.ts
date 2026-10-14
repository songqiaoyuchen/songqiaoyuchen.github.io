// Travel content: real trips in real places, oldest first. Every trip has an introduction; recorded tracks, stops,
// galleries and stories are each optional. A trip's stops are its places of note, each a named marker with the trip
// open. Stories and each gallery photo carry their own dates. Facts marked
// placeholder are invented until the real data arrives. A gallery's photos are a folder,
// public/travel/photos/<trip>/<gallery>/, made from photos-src/ by `npm run import:travel-photos`, with a
// photos.json giving each photo's date, location and optional description; the sync reads it into travelPhotos.json.
import {formatEntryStart} from './about';
import TRAVEL_PHOTOS from './travelPhotos.json';

/** Degrees, longitude first (east positive), latitude second (north positive). */
export type LonLat = readonly [number, number];

export type TravelMode = 'bicycle' | 'hike' | 'train' | 'flight';

/** A trip's own marker on the globe in place of the diamond (components/scene/travel/TripIcon.tsx). */
export type TripIcon = 'ventoux' | 'hairpins';

/** A gallery's photo, from its folder and the folder's photos.json (galleryPhotos). */
export type GalleryPhoto = {
  src: string;
  /** A small copy for the trip panel; the site serves images unresized. */
  thumb: string;
  width: number;
  height: number;
  /** The day it was taken, as YYYY-MM-DD; a gallery's photos are in date order. */
  date: string;
  location: string;
  /** Empty when the photo has none. */
  description: string;
};

/** A titled set of photos, each with its own date and place; its photos are the folder named by its id. */
export type Gallery = {id: string; title: string};

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
  /** In English, shown first. */
  description: string;
  /** The description in Chinese */
  descriptionZh?: string;
  /**
   * Recorded tracks, each a run of places in order. Recordings break, so one trip may hold several;
   * the straight gap from one track's end to the next one's start is drawn dotted.
   */
  segments?: readonly (readonly LonLat[])[];
  /** Places of note, in the order visited; nothing is drawn between them but the trip's own tracks. */
  stops?: readonly TripStop[];
  galleries?: readonly Gallery[];
  stories?: readonly Story[];
  /** Left off the site (list, globe and route) until its details are filled in. */
  draft?: true;
};

const ALL_TRIPS: readonly Trip[] = [
  {
    id: 'g318',
    title: 'G318: Chengdu to Lhasa',
    start: '2026-05-14',
    days: 30,
    distanceKm: 1800, // placeholder
    mode: 'bicycle',
    place: {name: 'Chengdu, Sichuan', lonLat: [104.07, 30.67]},
    summary: 'Solo bikepacking through the Hengduan Mountains and the Tibetan Plateau.',
    description: 'China\'s National Highway 318 is the country\'s most iconic long-distance cycling route.'
     + ' Crossing fourteen mountain passes alone,'
     + ' riding across a plateau averaging 4,000 metres above sea level, was more than a test of willpower.'
     + ' it was a solitary spiritual pilgrimage inward.'
     + ' I once naively believed that the wind rushing past me would carry the answers to life.'
     + ' I am still searching for them today.'
     + ' For mountains and rivers are easy to cross; harder to overcome is the weight we give our own hearts.',
    descriptionZh: 'G318国道是中国最经典的长途骑行路线，更是诸多骑行者的朝圣之路'
    + ' 单人翻越14座大山，在平均4000米的高原上骑行，不仅是对意志力的考验，更像是一场孤独的自我修行。'
    + ' 不成熟的我曾以为，驰骋的风会告诉我生活的答案，如今我仍在追寻它的路上。山川易渡，唯心自负。',
    // Placeholder tracks traced from town to town; the real GPX recordings replace them.
    segments: [
      [[104.07, 30.67], [102.99, 29.98], [101.96, 30.05], [101.49, 30.05], [100.27, 30.0]],
      [[96.77, 29.5], [95.77, 29.86], [94.36, 29.65], [92.7, 29.9], [91.13, 29.65]],
    ],
    stops: [
      {id: 'chengdu', name: 'Chengdu', lonLat: [104.07, 30.67]},
      {id: 'litang', name: 'Litang', lonLat: [100.27, 30.0]},
      {id: 'markam', name: 'Markam', lonLat: [98.59, 29.68]},
      {id: 'rawu', name: 'Rawu', lonLat: [96.77, 29.5]},
      {id: 'nyingchi', name: 'Nyingchi', lonLat: [94.36, 29.65]},
      {id: 'lhasa', name: 'Lhasa', lonLat: [91.13, 29.65]},
    ],
    galleries: [
      {id: 'sichuan', title: 'Sichuan'},
      {id: 'tibet', title: 'Tibet'},
    ],
    stories: [{title: 'Placeholder: the road to Lhasa', date: '2026-06-12'}],
  },
  {
    id: 'triple-crown',
    title: 'Norway: Triple Crown',
    start: '2026-08-21',
    days: 6,
    mode: 'hike',
    place: {name: 'Rogaland and Vestland, Norway', lonLat: [6.19, 58.99]},
    summary: 'Three of Norway\'s most iconic and dramatic rock formations and summits.',
    description: 'Impromptu hikes to Preikestolen, Kjeragbolten and Trolltunga packed into four days.'
      + ' A challenging but rewarding experience with two friends. It has some of the most breathtaking'
      + ' and photogenic views over the fjords in Norway.',
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
    draft: true,
    title: 'London',
    start: '2026-09-20',
    place: {name: 'London, England', lonLat: [-0.13, 51.51]},
    summary: 'Placeholder. Two days in London.',
    description: 'Placeholder.',
  },
  {
    id: 'marseille',
    draft: true,
    title: 'Marseille',
    start: '2026-09-22',
    place: {name: 'Marseille, Provence', lonLat: [5.37, 43.3]},
    summary: 'Placeholder. The old port and the calanques.',
    description: 'Placeholder.',
    galleries: [
      {id: 'city', title: 'Placeholder: Marseille'},
    ],
  },
  {
    id: 'mont-ventoux',
    draft: true,
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
    draft: true,
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
    draft: true,
    title: 'Zurich',
    start: '2026-09-27',
    place: {name: 'Zurich, Switzerland', lonLat: [8.54, 47.37]},
    summary: 'Placeholder. A day by the lake.',
    description: 'Placeholder.',
  },
];

/** The published trips; mark a trip `draft: true` to hide it. */
export const TRIPS = ALL_TRIPS.filter((trip) => !trip.draft);

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

/** A photo's alt text: its description, else the gallery, place and date. */
export function photoAlt(gallery: Gallery, photo: GalleryPhoto) {
  return photo.description || `${gallery.title}: ${photo.location}, ${formatDay(photo.date)}`;
}

/** "24 Sep 2026" for a story or photo. */
export function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** "2024 – 2025" for the trip index heading, or the single year. */
export function formatTripYears(trips: readonly Trip[]) {
  const years = trips.map((trip) => trip.start.slice(0, 4));
  const first = years[0];
  const last = years[years.length - 1];
  return first === last ? first : `${first} – ${last}`;
}
