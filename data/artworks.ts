export interface Artwork {
  id: string;
  src: string;
  alt: string;
  title: string;
  description: string;
  material: string;
  size: string;
  width: number;
  height: number;
}

export interface ArtworkSection {
  id: string;
  label: string;
  artworks: readonly Artwork[];
}

const DIGITAL_ARTWORKS: readonly Artwork[] = [
  {
    id: '20220702',
    src: '/images/art-previews/20220702.jpg',
    alt: 'Dark peaked buildings with a red-lit figure in a window',
    title: '20220702',
    description: 'A quiet architectural study where a single red-lit window interrupts the dark, peaked skyline.',
    material: 'Digital artwork',
    size: '2066 x 1986 px',
    width: 2066,
    height: 1986,
  },
  {
    id: 'k2',
    src: '/images/art-previews/k2.jpg',
    alt: 'Blue-toned painting of a snow-covered mountain peak',
    title: 'K2',
    description: 'A blue-toned study of K2, shaped through sharp ridgelines, snow, and a deep atmospheric sky.',
    material: 'Digital artwork',
    size: '866 x 640 px',
    width: 866,
    height: 640,
  },
  {
    id: 'reze',
    src: '/images/art-previews/Reze.png',
    alt: 'Illustration of Reze against a white and purple background',
    title: 'Reze',
    description: 'A character illustration of Reze framed by a restrained white and violet composition.',
    material: 'Digital illustration',
    size: '1050 x 831 px',
    width: 1050,
    height: 831,
  },
  {
    id: 'night',
    src: '/images/art-previews/\u591cfinal.jpg',
    alt: 'Figure overlooking a red-lit city at night',
    title: '\u591c',
    description: 'A lone figure looks over a city at night as red light gathers across the distant buildings.',
    material: 'Digital artwork',
    size: '1410 x 798 px',
    width: 1410,
    height: 798,
  },
];

export const ARTWORK_SECTIONS: readonly ArtworkSection[] = [
  {
    id: 'oil',
    label: 'Oil',
    artworks: DIGITAL_ARTWORKS,
  },
  {
    id: 'digital',
    label: 'Digital',
    artworks: DIGITAL_ARTWORKS,
  },
  {
    id: 'pencil',
    label: 'Pencil',
    artworks: DIGITAL_ARTWORKS,
  },
];

export const FEATURED_ARTWORKS = DIGITAL_ARTWORKS;
