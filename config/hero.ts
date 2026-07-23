export const HERO_CONTENT = {
  eyebrow: "HELLO, I'M",
  name: 'SONG',
  supportingLines: [
    'CS + MATHEMATICS AT NUS',
    'SOFTWARE AND VISUAL EXPERIMENTS',
  ],
} as const;

/**
 * Scene-specific tuning for the homepage identity.
 * Screen position is in normalized device coordinates: -1/1 are viewport edges.
 */
export const HERO_SCENE_CONFIG = {
  screenPosition: [0.36, -0.02] as const,
  size: 1.3,
  spacing: 0.01,
  /** World-space Y offset after camera-depth placement. Positive values raise the word. */
  bottomOffset: 0.7,
  intensity: 0.72,
  seed: 24.7,
  depthMultiplier: 0.95,
  tiltDegrees: 2.2,
  entranceDelay: 1.42,
  revealSpeed: 2.4,
  hideSpeed: 4.8,
  desktopMinWidth: 768,
} as const;

export const HERO_ANNOTATION_LAYOUT = {
  desktopLeft: '54.5vw',
  eyebrowTop: '27.5svh',
  supportingTop: '55svh',
} as const;
