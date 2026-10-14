// Homepage hero tuning: the WebGL name (SceneHeroName) and the HTML annotation layout (Hero).
// The copy itself lives in data/hero.ts.
import {VIEWPORT_BREAKPOINTS} from '@/config/breakpoints';

/**
 * Scene-specific tuning for the homepage identity.
 * Screen position is in normalized device coordinates: -1/1 are viewport edges.
 */
export const HERO_SCENE_CONFIG = {
  screenPosition: [0.36, -0.02] as const,
  size: 1.3,
  glyphWidthToHeightRatio: 1,
  spacing: -0.5,
  bottomOffset: 0.7,
  intensity: 0.72,
  seed: 24.7,
  depthMultiplier: 0.95,
  tiltDegrees: 2.2,
  entranceDelay: 1.42,
  revealSpeed: 2.4,
  hideSpeed: 4.8,
  hoverHitArea: {
    width: '16rem',
    height: '6rem',
  },
  desktopMinWidth: VIEWPORT_BREAKPOINTS.md,
  /** Mobile: the name's width as a share of the HTML name it covers (glyph quads carry SDF padding). */
  mobileWidthScale: 1.15,
} as const;

export const HERO_ANNOTATION_LAYOUT = {
  desktopLeft: '54.5vw',
  eyebrowTop: '27.5svh',
  supportingTop: '55svh',
} as const;

/** Typewriter delays; keep in step with the --animate-hero-* tokens in styles/tokens.css. */
export const HERO_REVEAL = {
  eyebrowDelayMs: 120,
  supportingDelaysMs: [1760, 2460],
} as const;
