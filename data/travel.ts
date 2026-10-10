// Travel content: real trips in real places, oldest first. Every trip has an introduction; recorded tracks,
// photos and an article are each optional. Facts marked placeholder are invented until the real data arrives.
import {formatEntryStart} from './about';

/** Degrees, longitude first (east positive), latitude second (north positive). */
export type LonLat = readonly [number, number];

export type TravelMode = 'bicycle' | 'hike' | 'train' | 'flight';

export type TripPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Trip = {
  id: string;
  title: string;
  /** First day as YYYY-MM-DD; trips are listed by it, oldest first. */
  start: string;
  days?: number;
  distanceKm?: number;
  mode: TravelMode;
  /** The place the marker stands on and the globe turns to; the start of a long route. */
  place: {name: string; lonLat: LonLat};
  summary: string;
  description: string;
  /**
   * Recorded tracks, each a run of places in order. Recordings break, so one trip may hold several;
   * the straight gap from one track's end to the next one's start is drawn dotted.
   */
  segments?: readonly (readonly LonLat[])[];
  photos?: readonly TripPhoto[];
  /** Slug of the Blog article telling the story, when one exists. */
  articleSlug?: string;
};

export const TRIPS: readonly Trip[] = [
  {
    id: 'mont-ventoux',
    title: 'Mont Ventoux',
    start: '2024-07-14', // placeholder
    days: 1,
    distanceKm: 21, // placeholder: Bédoin to the summit
    mode: 'bicycle',
    place: {name: 'Mont Ventoux, Provence', lonLat: [5.279, 44.174]},
    summary: 'The bald mountain of Provence, climbed from Bédoin.',
    description: 'Placeholder. A single day, a single climb: the forest, then the moonscape above Chalet Reynard, '
      + 'then the tower. Dates and distance are placeholders until the ride is written up.',
  },
  {
    id: 'g318',
    title: 'G318, Chengdu to Lhasa',
    start: '2025-06-01', // placeholder
    days: 14, // placeholder
    distanceKm: 2150, // placeholder
    mode: 'bicycle',
    place: {name: 'Chengdu, Sichuan', lonLat: [104.07, 30.67]},
    summary: 'The Sichuan–Tibet highway over the Hengduan ranges, by bicycle.',
    description: 'Placeholder. Two recordings that do not meet: the first from Chengdu over the first passes, the '
      + 'second from the Nyingchi side into Lhasa. The gap between them is drawn dotted until the missing days are '
      + 'recovered. Dates, days and distance are placeholders.',
    // Placeholder tracks traced from town to town; the real GPX recordings replace them.
    segments: [
      [[104.07, 30.67], [102.99, 29.98], [101.96, 30.05], [100.27, 30.0]],
      [[96.77, 29.5], [95.77, 29.86], [94.36, 29.65], [92.7, 29.9], [91.13, 29.65]],
    ],
  },
];

export function getTrip(id: string | undefined) {
  return TRIPS.find((trip) => trip.id === id);
}

const MODE_LABELS: Record<TravelMode, string> = {
  bicycle: 'bicycle',
  hike: 'on foot',
  train: 'train',
  flight: 'flight',
};

/** "Jun 2025 · 14 days · 2,150 km · bicycle"; parts a trip lacks are left out. */
export function formatTripMeta(trip: Trip) {
  const parts = [formatEntryStart(trip.start.slice(0, 7))];
  if (trip.days) parts.push(trip.days === 1 ? '1 day' : `${trip.days} days`);
  if (trip.distanceKm) parts.push(`${trip.distanceKm.toLocaleString('en')} km`);
  parts.push(MODE_LABELS[trip.mode]);
  return parts.join(' · ');
}

/** "2024 – 2025" for the trip index heading, or the single year. */
export function formatTripYears(trips: readonly Trip[]) {
  const years = trips.map((trip) => trip.start.slice(0, 4));
  const first = years[0];
  const last = years[years.length - 1];
  return first === last ? first : `${first} – ${last}`;
}
