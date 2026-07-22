import type {SectionId} from '@/data/sections';

export interface LinkStream {
  id: SectionId;
  index: number;
  text: string;
  anchor: [number, number];
  size: number;
  spacing: number;
  bottomOffset: number;
  navRange: [number, number];
  intensity: number;
  seed: number;
}

const LINK_STREAM_DEFINITIONS: Array<Omit<LinkStream, 'index'>> = [
  {
    id: 'projects',
    text: 'PROJECTS',
    navRange: [0, 8],
    anchor: [7.05, 4.05],
    size: 0.45,
    spacing: 0.08,
    bottomOffset: 0.6,
    intensity: 1.18,
    seed: 2.1,
  },
  {
    id: 'art',
    text: 'ART',
    navRange: [0, 3],
    anchor: [8, 1.53],
    size: 0.43,
    spacing: 0.08,
    bottomOffset: 1.7,
    intensity: 1.12,
    seed: 7.4,
  },
  {
    id: 'blog',
    text: 'BLOG',
    navRange: [0, 4],
    anchor: [-0.1, 0.6],
    size: 0.45,
    spacing: 0.08,
    bottomOffset: 2.32,
    intensity: 1.16,
    seed: 12.7,
  },
  {
    id: 'about',
    text: 'ABOUT',
    navRange: [0, 5],
    anchor: [-1, -0.63],
    size: 0.43,
    spacing: 0.08,
    bottomOffset: 1.38,
    intensity: 1.1,
    seed: 18.3,
  },
];

export const LINK_STREAMS: LinkStream[] = LINK_STREAM_DEFINITIONS.map(
  (stream, index) => ({...stream, index}),
);
