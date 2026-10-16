// Scene links: the glowing ART / PROJECTS / BLOG / ABOUT words standing on the homepage terrain.
// Placement, effect timing and per-link geometry; dev-config writes the mobile keys here.
import type {SectionId} from '@/data/sections';

export interface SceneLink {
  id: SectionId;
  index: number;
  text: string;
  anchor: [number, number];
  size: number;
  spacing: number;
  /** Stable vertical baseline used by the focused layout and layout projection. */
  focusedBottomOffset: number;
  /** Desktop overview-only vertical lift. Mobile overview removes bottom lift. */
  overviewBottomOffset: number;
  /** Negative values move the overview slot lower on screen and closer in depth. */
  overviewYOffset: number;
  navRange: [number, number];
  intensity: number;
  seed: number;
}

export interface MobileSceneLinkSettings {
  mobileStartX: number;
  mobileEndX: number;
  mobileCenterY: number;
  mobileDepthOffset: number;
}

/**
 * Screen-space placement for the homepage links.
 *
 * X/Y values use normalized device coordinates: -1 is the left/bottom edge,
 * 0 is the viewport center, and 1 is the right/top edge.
 */
export const SCENE_LINK_LAYOUT = {
  overview: {
    desktop: {
      startX: -0.8,
      endX: -0.16,
      centerY: -0.12,
    },
  },
  focused: {
    startX: 0.04,
    endX: 0.78,
    centerY: 0.145,
    closestSearchY: -0.05,
    order: ['art', 'blog', 'projects', 'places', 'about'],
  },
} as const;

/**
 * Mobile-only screen-space placement.
 *
 * X/Y positions are normalized device coordinates.
 */
export const MOBILE_SCENE_LINK_CONFIG = {
  mobileStartX: -0.68,
  mobileEndX: 0.68,
  mobileCenterY: -1.2,
  mobileDepthOffset: 9,
} as const satisfies MobileSceneLinkSettings;

/** Shared scene-text timing; the hero name and glyph rain reuse the dissolve speeds. */
export const SCENE_LINK_EFFECT_CONFIG = {
  lift: 0.075,
  layoutDamping: 7,
  focusedSpacingMultiplier: 0.5,
  dissolveOutSpeed: 4.8,
  dissolveInSpeed: 3.2,
  hoverDamping: 9,
  letterSwapDuration: 0.4,
  jiggleStrength: 0.5,
  glitchDecay: 3.6,
} as const;

const SCENE_LINK_DEFINITIONS: Array<Omit<SceneLink, 'index'>> = [
  {
    id: 'art',
    text: 'ART',
    navRange: [0, 3],
    anchor: [8, 1.53],
    size: 0.48,
    spacing: 0.04,
    focusedBottomOffset: 1.7,
    overviewBottomOffset: 2.7,
    overviewYOffset: -0.05,
    intensity: 1.12,
    seed: 7.4,
  },
  {
    id: 'projects',
    text: 'PROJECTS',
    navRange: [0, 8],
    anchor: [7.05, 4.05],
    size: 0.45,
    spacing: 0.04,
    focusedBottomOffset: 0.6,
    overviewBottomOffset: 1.2,
    overviewYOffset: 0,
    intensity: 1.18,
    seed: 2.1,
  },
  {
    id: 'blog',
    text: 'BLOG',
    navRange: [0, 4],
    anchor: [-0.1, 0.6],
    size: 0.45,
    spacing: 0.04,
    focusedBottomOffset: 2.32,
    overviewBottomOffset: 2.62,
    overviewYOffset: 0,
    intensity: 1.16,
    seed: 12.7,
  },
  {
    id: 'places',
    text: 'PLACES',
    navRange: [0, 6],
    anchor: [-2.4, 1.7],
    size: 0.43,
    spacing: 0.04,
    focusedBottomOffset: 1.38,
    overviewBottomOffset: 1.38,
    overviewYOffset: 0.1,
    intensity: 1.1,
    seed: 23.9,
  },
  {
    id: 'about',
    text: 'ABOUT',
    navRange: [0, 5],
    anchor: [-1, -0.63],
    size: 0.43,
    spacing: 0.04,
    focusedBottomOffset: 1.38,
    overviewBottomOffset: 1.38,
    overviewYOffset: 0,
    intensity: 1.1,
    seed: 18.3,
  },
];

export const SCENE_LINKS: SceneLink[] = SCENE_LINK_DEFINITIONS.map(
  (link, index) => ({...link, index}),
);
