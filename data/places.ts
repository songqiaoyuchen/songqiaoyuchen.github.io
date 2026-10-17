// Places content: real locations, oldest first. A location with recorded tracks (segments) is a path, drawn as its
// route; any other is marked at one place. Each published location has its own sharper ground, baked to
// public/places/ground/<id>.webp by `node scripts/assets/build-places-geo.mjs ground <id> <lon> <lat>` at the
// middle of the box about its places (useLocationGround.ts); a location without one shows the global map. Every
// location has an introduction; recorded tracks, stops, galleries and stories are each optional. A location's stops
// are its places of note, each a named marker with the location open. Stories and each gallery photo carry their own
// dates. Facts marked placeholder are invented until the real data arrives. A gallery's photos are a folder,
// public/places/photos/<location>/<gallery>/, made from photos-src/ by `npm run import:places-photos`, with a
// photos.json giving each photo's date, location, optional description and optional order; the sync reads it into
// placesPhotos.json.
import {formatEntryStart} from './about';
import PLACES_PHOTOS from './placesPhotos.json';

/** Degrees, longitude first (east positive), latitude second (north positive). */
export type LonLat = readonly [number, number];

export type TravelMode = 'bicycle' | 'hike' | 'train' | 'flight';

/** A location's own marker on the globe in place of the diamond (components/scene/places/LocationIcon.tsx). */
export type LocationIcon = 'ventoux' | 'hairpins';

/** A gallery's photo, from its folder and the folder's photos.json (galleryPhotos). */
export type GalleryPhoto = {
  src: string;
  /** A small copy for the location panel; the site serves images unresized. */
  thumb: string;
  width: number;
  height: number;
  /** The day it was taken, as YYYY-MM-DD; a gallery's photos are in date order. */
  date: string;
  location: string;
  /** Empty when the photo has none. */
  description: string;
  /** Moves the photo ahead of the rest in the location panel's strip, lowest first; the gallery keeps date order. */
  order?: number;
};

/** A titled set of photos, each with its own date and place; its photos are the folder named by its id. */
export type Gallery = {id: string; title: string};

/** A written account: a Blog article once `slug` names one, a placeholder until then. */
export type Story = {title: string; date: string; slug?: string};

/** A place of note on a location: a marker named on hover. */
export type LocationStop = {id: string; name: string; lonLat: LonLat};

export type Location = {
  id: string;
  title: string;
  /** First day as YYYY-MM-DD; locations are listed by it, oldest first. Shown only for a location with a mode. */
  start: string;
  days?: number;
  distanceKm?: number;
  /** How it was travelled; a city visit has none, and shows no dates (its galleries and stories carry them). */
  mode?: TravelMode;
  /** The place the marker stands on and the globe turns to; the start of a long route. */
  place: {name: string; lonLat: LonLat};
  /** Its own marker in place of the diamond. */
  icon?: LocationIcon;
  summary: string;
  /** In English, shown first. */
  description: string;
  /** The description in Chinese */
  descriptionZh?: string;
  /**
   * Recorded tracks, each a run of places in order; a location with any is a path. Recordings break, so one path may
   * hold several; the straight gap from one track's end to the next one's start is drawn dotted.
   */
  segments?: readonly (readonly LonLat[])[];
  /** Places of note, in the order visited; nothing is drawn between them but the location's own tracks. */
  stops?: readonly LocationStop[];
  galleries?: readonly Gallery[];
  stories?: readonly Story[];
  /** Left off the site (list, globe and route) until its details are filled in. */
  draft?: true;
};

const ALL_LOCATIONS: readonly Location[] = [
  {
    id: 'xinjiang',
    title: 'Xinjiang: To Sayram Lake',
    start: '2024-06-25',
    days: 16,
    distanceKm: 777, // routed by road between the stops, not recorded
    mode: 'bicycle',
    place: {name: 'Ili, Xinjiang', lonLat: [84.9, 44.42]},
    summary: 'Bikepacking over the Tianshan Mountains and west through the Ili Valley to the last teardrop of the Atlantic Ocean - Sayram Lake.',
    description: 'Since then, I\'ve travelled farther and seen more of the world, yet Xinjiang has only grown more special to me.'
      + ' It was our first long-distance cycling trip — the three of us, inexperienced and wide-eyed, stumbling through mishaps and making plenty of memories we\'d later laugh about.'
      + ' We hadn\'t yet figured out the road ahead, but we never doubted we would make it to the end.',
    descriptionZh: '后来我走过了更远的路，看到了更多的风景，新疆却在我心中占据着愈发特殊的位置。'
      + '那是我们三人第一次长途骑行，带着新手的稚嫩和纯真，搞出了很多笑话和事故。'
      + '我们还没搞清楚前方的路，却从未怀疑过自己能否抵达终点。',
    // Traced along the roads from Kuitun over the Duku Highway, through Xinyuan and Gongliu, over the
    // Wusun Mountains and up Guozigou to Sayram Lake; the real GPX recordings replace it.
    segments: [
      [
        [84.901, 44.424], [84.916, 44.423], [84.911, 44.377], [84.886, 44.347], [84.892, 44.330], [84.876,
        44.326], [84.883, 44.306], [84.874, 44.264], [84.830, 44.177], [84.834, 44.146], [84.822, 44.115],
        [84.816, 44.117], [84.803, 44.097], [84.790, 44.093], [84.794, 44.080], [84.751, 44.093], [84.719,
        44.094], [84.716, 44.070], [84.698, 44.045], [84.684, 44.030], [84.650, 44.021], [84.645, 44.007],
        [84.611, 43.980], [84.603, 43.956], [84.583, 43.943], [84.556, 43.939], [84.544, 43.925], [84.513,
        43.912], [84.489, 43.871], [84.469, 43.864], [84.467, 43.836], [84.477, 43.823], [84.466, 43.789],
        [84.441, 43.768], [84.437, 43.751], [84.409, 43.738], [84.422, 43.734], [84.419, 43.728], [84.442,
        43.722], [84.448, 43.716], [84.436, 43.721], [84.455, 43.705], [84.445, 43.709], [84.427, 43.693],
        [84.400, 43.688], [84.418, 43.686], [84.406, 43.659], [84.405, 43.667], [84.395, 43.656], [84.371,
        43.650], [84.308, 43.647], [84.305, 43.639], [84.323, 43.621], [84.335, 43.589], [84.359, 43.561],
        [84.393, 43.535], [84.470, 43.512], [84.443, 43.514], [84.437, 43.503], [84.429, 43.510], [84.440,
        43.454], [84.422, 43.452], [84.409, 43.438], [84.383, 43.426], [84.372, 43.390], [84.385, 43.415],
        [84.383, 43.372], [84.373, 43.362], [84.364, 43.366], [84.367, 43.358], [84.359, 43.367], [84.366,
        43.349], [84.353, 43.323], [84.331, 43.298], [84.309, 43.286], [84.280, 43.278], [84.209, 43.301],
        [84.029, 43.319], [83.970, 43.334], [83.869, 43.378], [83.738, 43.420], [83.721, 43.416], [83.622,
        43.431], [83.445, 43.422], [83.375, 43.425], [83.262, 43.413], [83.262, 43.432], [83.208, 43.432],
        [83.208, 43.407], [83.153, 43.404], [83.084, 43.421], [83.038, 43.416], [82.933, 43.431], [82.901,
        43.431], [82.842, 43.417], [82.760, 43.417], [82.743, 43.429], [82.560, 43.439], [82.489, 43.419],
        [82.351, 43.469], [82.294, 43.465], [82.270, 43.451], [82.227, 43.480], [82.190, 43.479], [82.118,
        43.464], [82.091, 43.474], [82.024, 43.533], [81.983, 43.552], [81.935, 43.496], [81.927, 43.495],
        [81.925, 43.469], [81.896, 43.414], [81.869, 43.390], [81.862, 43.363], [81.847, 43.350], [81.817,
        43.340], [81.810, 43.329], [81.806, 43.247], [81.836, 43.218], [81.792, 43.196], [81.749, 43.157],
        [81.707, 43.163], [81.680, 43.158], [81.543, 43.164], [81.513, 43.155], [81.454, 43.159], [81.390,
        43.140], [81.240, 43.143], [81.140, 43.156], [81.126, 43.153], [81.133, 43.177], [81.123, 43.225],
        [81.072, 43.278], [81.064, 43.330], [81.042, 43.351], [81.036, 43.347], [81.036, 43.359], [81.019,
        43.362], [81.039, 43.370], [81.031, 43.376], [81.040, 43.380], [81.026, 43.386], [81.047, 43.392],
        [81.052, 43.406], [81.028, 43.411], [81.065, 43.431], [81.073, 43.447], [81.113, 43.467], [81.110,
        43.476], [81.127, 43.491], [81.115, 43.491], [81.123, 43.497], [81.119, 43.510], [81.144, 43.528],
        [81.176, 43.774], [81.207, 43.776], [81.223, 43.787], [81.220, 43.829], [81.256, 43.861], [81.264,
        43.906], [81.275, 43.905], [81.264, 43.906], [81.265, 43.911], [81.292, 43.946], [81.201, 43.977],
        [81.126, 43.965], [81.076, 43.965], [81.004, 43.995], [80.936, 44.006], [80.889, 44.065], [80.827,
        44.084], [80.810, 44.105], [80.779, 44.180], [80.784, 44.214], [80.815, 44.221], [80.868, 44.257],
        [80.924, 44.311], [80.974, 44.344], [80.985, 44.368], [81.054, 44.433], [81.135, 44.471], [81.157,
        44.468], [81.157, 44.459], [81.145, 44.458], [81.128, 44.480], [81.151, 44.482], [81.168, 44.493],
        [81.327, 44.535], [81.371, 44.588], [81.400, 44.598], [81.375, 44.603], [81.335, 44.629], [81.230,
        44.675]
      ],
    ],
    stops: [
      {id: 'urumqi', name: 'Urumqi', lonLat: [87.61, 43.82]},
      {id: 'kuitun', name: 'Kuitun', lonLat: [84.9, 44.42]},
      {id: 'nalati', name: 'Nalati', lonLat: [84.0, 43.33]},
      {id: 'tekes', name: 'Tekes', lonLat: [81.83, 43.22]},
      {id: 'zhaosu', name: 'Zhaosu', lonLat: [81.13, 43.15]},
      {id: 'yining', name: 'Yining', lonLat: [81.27, 43.91]},
      {id: 'sayram', name: 'Sayram Lake', lonLat: [81.18, 44.61]},
    ],
    galleries: [
      {id: 'duku', title: 'Duku Highway'},
      {id: 'ili', title: 'Ili Valley'},
    ]
  },
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
     + ' Crossing fourteen mountain passes by myself,'
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
    ]
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
    galleries: [
      {id: 'hikes-city', title: 'Hikes and City'},
    ]
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

/** The published locations; mark a location `draft: true` to hide it. */
export const LOCATIONS = ALL_LOCATIONS.filter((location) => !location.draft);

export function getLocation(id: string | undefined) {
  return LOCATIONS.find((location) => location.id === id);
}

/** A path: a location with recorded tracks, drawn and marked by its route instead of at one place. */
export function isPath(location: Location) {
  return (location.segments ?? []).some((segment) => segment.length > 1);
}

const PHOTOS: Readonly<Record<string, readonly GalleryPhoto[]>> = PLACES_PHOTOS;

/** A gallery's photos, from public/places/photos/<location>/<gallery>/; none until the folder has some. */
export function galleryPhotos(location: Location, gallery: Gallery) {
  return PHOTOS[`${location.id}/${gallery.id}`] ?? [];
}

/**
 * A gallery's strip of thumbnails: photos with an order first, lowest first, then the rest in date order. Each keeps
 * its index in the gallery, which stays in date order, and `gap` marks where the strip breaks: after the ordered
 * photos, and where a new day starts among the rest.
 */
export function stripPhotos(photos: readonly GalleryPhoto[]) {
  const indexed = photos.map((photo, index) => ({photo, index}));
  const ordered = indexed
    .filter(({photo}) => photo.order !== undefined)
    .sort((a, b) => a.photo.order! - b.photo.order! || a.index - b.index);
  const rest = indexed.filter(({photo}) => photo.order === undefined);
  return [
    ...ordered.map((item) => ({...item, gap: false})),
    ...rest.map((item, i) => ({
      ...item,
      gap: i ? item.photo.date !== rest[i - 1].photo.date : ordered.length > 0,
    })),
  ];
}

const MODE_LABELS: Record<TravelMode, string> = {
  bicycle: 'ride',
  hike: 'hike',
  train: 'train',
  flight: 'flight',
};

/** "Jun 2025 · 14 days · 2,150 km · ride"; parts a location lacks are left out, a city visit's dates too. */
export function formatLocationMeta(location: Location) {
  if (!location.mode) return 'City';
  const parts = [formatEntryStart(location.start.slice(0, 7))];
  if (location.days) parts.push(location.days === 1 ? '1 day' : `${location.days} days`);
  if (location.distanceKm) parts.push(`${location.distanceKm.toLocaleString('en')} km`);
  parts.push(MODE_LABELS[location.mode]);
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

/** "2024 – 2025" for the location index heading, or the single year. */
export function formatLocationYears(locations: readonly Location[]) {
  const years = locations.map((location) => location.start.slice(0, 4));
  const first = years[0];
  const last = years[years.length - 1];
  return first === last ? first : `${first} – ${last}`;
}
