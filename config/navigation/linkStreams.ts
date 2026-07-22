import type {SectionId} from '@/data/sections';

export interface LinkStream {
  id: SectionId;
  index: number;
  text: string;
  anchor: [number, number];
  size: number;
  spacing: number;
  bottomOffset: number;
  /** Negative values move the overview slot lower on screen and closer in depth. */
  overviewYOffset: number;
  navRange: [number, number];
  intensity: number;
  seed: number;
}

/**
 * Screen-space placement for the homepage streams.
 *
 * X/Y values use normalized device coordinates: -1 is the left/bottom edge,
 * 0 is the viewport center, and 1 is the right/top edge.
 */
export const LINK_STREAM_LAYOUT = {
  overview: {
    innerX: 0.46,
    outerX: 0.72,
    centerY: 0.045,
  },
  focused: {
    startX: 0.04,
    endX: 0.78,
    centerY: 0.145,
    closestSearchY: -0.05,
  },
} as const;

export const LINK_STREAM_EFFECT_CONFIG = {
  lift: 0.075,
  layoutDamping: 7,
  dissolveOutSpeed: 4.8,
  dissolveInSpeed: 3.2,
  hoverDamping: 9,
  glitchDecay: 3.6,
} as const;

const LINK_STREAM_DEFINITIONS: Array<Omit<LinkStream, 'index'>> = [
  {
    id: 'projects',
    text: 'PROJECTS',
    navRange: [0, 8],
    anchor: [7.05, 4.05],
    size: 0.45,
    spacing: 0.04,
    bottomOffset: 0.6,
    overviewYOffset: 0,
    intensity: 1.18,
    seed: 2.1,
  },
  {
    id: 'art',
    text: 'ART',
    navRange: [0, 3],
    anchor: [8, 1.53],
    size: 0.48,
    spacing: 0.04,
    bottomOffset: 1.7,
    overviewYOffset: -0.05,
    intensity: 1.12,
    seed: 7.4,
  },
  {
    id: 'blog',
    text: 'BLOG',
    navRange: [0, 4],
    anchor: [-0.1, 0.6],
    size: 0.45,
    spacing: 0.04,
    bottomOffset: 2.32,
    overviewYOffset: 0,
    intensity: 1.16,
    seed: 12.7,
  },
  {
    id: 'about',
    text: 'ABOUT',
    navRange: [0, 5],
    anchor: [-1, -0.63],
    size: 0.43,
    spacing: 0.04,
    bottomOffset: 1.38,
    overviewYOffset: 0,
    intensity: 1.1,
    seed: 18.3,
  },
];

export const LINK_STREAMS: LinkStream[] = LINK_STREAM_DEFINITIONS.map(
  (stream, index) => ({...stream, index}),
);
