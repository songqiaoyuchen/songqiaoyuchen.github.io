// Homepage hero tuning: which name renders, the HTML name's scramble (HeroName), the WebGL name (SceneHeroName)
// and the HTML annotation layout (Hero). The copy itself lives in data/hero.ts.
import {VIEWPORT_BREAKPOINTS} from '@/config/breakpoints';

export type HeroNameRenderer = 'html' | 'webgl';

/**
 * Which hero name Home shows: the flat HTML one (HeroName: scramble, text-shadow glow) or the WebGL one in the
 * scene (SceneHeroName: SDF glyphs, bloom, pixel dissolve). The terrain fallback always shows the HTML one.
 */
export const HERO_NAME_RENDERER: HeroNameRenderer = 'html';

/** HTML name scramble: columns break into random glyphs from the left, then settle from the left. */
export const HERO_SCRAMBLE = {
  glyphs: '!<>-_\\/[]{}=+*^?#%&$@0123456789ABCDEFXYZ',
  /** Glyph flicker rate. */
  frameMs: 50,
  /** Between one column breaking up and the next. */
  outStepMs: 22,
  /** Between one column settling and the next. */
  settleStepMs: 50,
  /** Pure flicker before the first column settles (hover and tap swaps). */
  leadMs: 320,
  /** The longer lead of the entrance decode. */
  entranceLeadMs: 640,
  /** Random spread added to each column's settle time, so the front is ragged. */
  jitterMs: 140,
} as const;

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
  /** Touch: how long a tap shows the alternate name before it swaps back (both renderers). */
  tapSwapHoldMs: 2400,
  desktopMinWidth: VIEWPORT_BREAKPOINTS.md,
  /** Mobile: the name's width as a share of the HTML name it covers (glyph quads carry SDF padding). */
  mobileWidthScale: 1.15,
} as const;

export const HERO_ANNOTATION_LAYOUT = {
  desktopLeft: '54.5vw',
  eyebrowTop: '27.5svh',
  /** Line height of the eyebrow (md:text-hero-annotation, leading 1.4), for the gap under it. */
  eyebrowLeading: 1.4,
  /** With the WebGL name: the supporting lines sit at a fixed height under the scene name. */
  supportingTop: '55svh',
  /** With the HTML name: its top, size and leading; the supporting lines follow it at the eyebrow's gap. */
  htmlName: {top: '34svh', size: 'clamp(4.5rem, 9vw, 8rem)', leading: 0.85},
} as const;

/** Typewriter delays; keep in step with the --animate-hero-* tokens in styles/tokens.css. */
export const HERO_REVEAL = {
  eyebrowDelayMs: 120,
  /** The name's fade-in delay (--animate-hero-name); the HTML name's entrance decode starts with it. */
  nameDelayMs: 1160,
  supportingDelaysMs: [1760, 2460],
} as const;
