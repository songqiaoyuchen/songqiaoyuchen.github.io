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

const ARTWORKS_BY_ID: Record<string, Artwork> = {
  amadablam: {
    id: 'amadablam',
    src: '/images/artworks/oil/ama-dablam.webp',
    alt: 'Oil painting of a Ama Dablam, Himalayas.',
    title: 'Ama Dablam',
    description:
      "The 'mother's charm box' in the Sherpa language and one of my hardest pieces. " +
      'I completed half in Singapore and finished in China. ' +
      "Intended as a warmup for my larger piece on Meili's 13 peaks.",
    material: 'Oil on Canvas',
    size: '40 x 30 cm',
    width: 4265,
    height: 3129,
  },
  winter: {
    id: 'winter',
    src: '/images/artworks/digital/winter.webp',
    alt: 'Dark peaked buildings with a red-lit figure in a window',
    title: 'Winter of 2022',
    description:
      'This piece was drawn over a photograph taken after the first snowfall of the winter of 2022. ' +
      'I was under COVID lockdown at a temporary home in Tianjin. ',
    material: 'Digital illustration',
    size: '2066 x 1986 px',
    width: 2066,
    height: 1986,
  },
  night: {
    id: 'night',
    src: '/images/artworks/digital/night.webp',
    alt: 'Figure overlooking a red-lit city at night',
    title: 'Night',
    description: 'Lights in the night, chaos under structures.',
    material: 'Digital illustration',
    size: '1410 x 798 px',
    width: 1410,
    height: 798,
  },
  k2: {
    id: 'k2',
    src: '/images/artworks/oil/k2.webp',
    alt: 'Blue-toned painting of K2',
    title: 'K2',
    description:
      'My first mountainscape painting created during Secondary School, still one of my favourites.',
    material: 'Oil on Canvas',
    size: '40 x 30 cm',
    width: 2403,
    height: 1807,
  },
  emma_one: {
    id: 'emma_one',
    src: '/images/artworks/pencil/emma_one.webp',
    alt: 'Portrait of Emma Watson',
    title: 'Emma Watson',
    description: '',
    material: 'Pencil and Charcoal on Paper',
    size: 'A3',
    width: 1179,
    height: 1473,
  },
  emma_two: {
    id: 'emma_two',
    src: '/images/artworks/pencil/emma_two.webp',
    alt: 'Portrait of Emma Watson',
    title: 'Emma Watson',
    description: '',
    material: 'Pencil on Paper',
    size: 'A3',
    width: 1179,
    height: 1284,
  },
  luci: {
    id: 'luci',
    src: '/images/artworks/pencil/luci.webp',
    alt: 'Portrait of Lucifer from TV Serires Lucifer',
    title: 'Luci',
    description: '',
    material: 'Pencil and Charcoal on Paper',
    size: 'A3',
    width: 1080,
    height: 1350,
  },
  einstein: {
    id: 'einstein',
    src: '/images/artworks/pencil/einstein.webp',
    alt: 'Portrait of Albert Einstein',
    title: 'Albert Einstein',
    description: '',
    material: 'Pencil on Paper',
    size: 'A3',
    width: 1179,
    height: 929,
  },
  alan_rickman: {
    id: 'alan_rickman',
    src: '/images/artworks/pencil/alan_rickman.webp',
    alt: 'Portrait of Alan Rickman',
    title: 'Alan Rickman',
    description: '',
    material: 'Pencil on Paper',
    size: 'A3',
    width: 1179,
    height: 1478,
  },
  tyrion: {
    id: 'tyrion',
    src: '/images/artworks/pencil/tyrion.webp',
    alt: 'Portrait of Tyrion Lannister from TV Series Game of Thrones',
    title: 'Tyrion Lannister',
    description: '',
    material: 'Pencil on Paper',
    size: 'A3',
    width: 1179,
    height: 1473,
  },
  autumn: {
    id: 'autumn',
    src: '/images/artworks/oil/autumn.webp',
    alt: 'Oil painting of road in the autumn forest.',
    title: 'Autumn',
    description: '',
    material: 'Oil on Panel',
    size: '10 x 10 cm',
    width: 2476,
    height: 2909,
  },
  spring_thunder: {
    id: 'spring_thunder',
    src: '/images/artworks/oil/spring_thunder.webp',
    alt: 'Oil painting of a thunderstorm in the spring.',
    title: 'Spring Thunder',
    description: '',
    material: 'Oil on Panel',
    size: '10 x 10 cm',
    width: 2951,
    height: 3008,
  },
  cat: {
    id: 'cat',
    src: '/images/artworks/oil/cat.webp',
    alt: 'Oil painting of a cat.',
    title: "Gwen's Cat",
    description: '',
    material: 'Oil on Panel',
    size: 'I forgot about the size',
    width: 3416,
    height: 2516,
  },
};

type ArtworkId = keyof typeof ARTWORKS_BY_ID;
function selectArtworks(ids: readonly ArtworkId[]): readonly Artwork[] {
  return ids.map((id) => ARTWORKS_BY_ID[id]);
}

const ARTWORK_SECTION_DEFINITIONS = [
  {id: 'oil', label: 'Oil', artworkIds: ['amadablam', 'k2', 'cat', 'autumn', 'spring_thunder']},
  {id: 'digital', label: 'Digital', artworkIds: ['winter', 'night']},
  {
    id: 'pencil',
    label: 'Pencil',
    artworkIds: ['emma_one', 'emma_two', 'luci', 'einstein', 'alan_rickman', 'tyrion'],
  },
] as const satisfies readonly {id: string; label: string; artworkIds: readonly ArtworkId[]}[];

export const ARTWORK_SECTIONS: readonly ArtworkSection[] = ARTWORK_SECTION_DEFINITIONS.map(
  ({id, label, artworkIds}) => ({id, label, artworks: selectArtworks(artworkIds)}),
);
const FEATURED_ARTWORK_IDS = [
  'amadablam',
  'k2',
  'night',
  'cat',
  'emma_two',
  'luci',
] as const satisfies readonly ArtworkId[];
export const FEATURED_ARTWORKS = selectArtworks(FEATURED_ARTWORK_IDS);

export type ArtMedium = 'oil' | 'digital' | 'pencil';
export const ALL_ARTWORKS = ARTWORK_SECTIONS.flatMap((section) => section.artworks);
export function getArtwork(id: string) {
  return ALL_ARTWORKS.find((artwork) => artwork.id === id);
}
export function getArtworkMedium(artwork: Artwork): ArtMedium {
  return ARTWORK_SECTIONS.find((section) => section.artworks.includes(artwork))!.id as ArtMedium;
}
