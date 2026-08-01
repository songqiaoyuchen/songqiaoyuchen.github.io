import {VIEWPORT_BREAKPOINTS} from '@/config/breakpoints';

export const HERO_CONTENT = {
  eyebrow: "HELLO, I'M",
  name: 'SQYC',
  hoverName: 'SONG',
  supportingLines: [
    'CS + MATH AT National University of SG',
    'EXPLORING SOFTWARE AND VISUAL SOLUTIONS',
  ],
} as const;

/**
 * Scene-specific tuning for the homepage identity.
 * Screen position is in normalized device coordinates: -1/1 are viewport edges.
 */
export const HERO_SCENE_CONFIG = {
  screenPosition: [0.36, -0.02] as const,
  size: 1.3,
  spacing: -0.3,
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
} as const;

export const HERO_ANNOTATION_LAYOUT = {
  desktopLeft: '54.5vw',
  eyebrowTop: '27.5svh',
  supportingTop: '55svh',
} as const;
