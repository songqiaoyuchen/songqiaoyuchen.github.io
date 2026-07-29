export type PreloaderVariant = 'contour' | 'type';

export const PRELOADER_CONFIG = {
  bypassDelayMs: 8000,
  defaultVariant: 'type' as PreloaderVariant,
  exitDurationMs: 450,
  previewDurationMs: 2500,
  reducedMotionExitDurationMs: 150,
  visualDelayMs: 200,
} as const;
