// Homepage preloader timing: count-up pacing, bypass offer and exit durations.
export const PRELOADER_CONFIG = {
  bypassDelayMs: 8000, // "Enter without terrain" appears after this
  countApproachDurationMs: 8000, // count-up from 0 to countLoadingLimit while loading
  countCompletionDurationMs: 360, // final run to 100 once the scene is ready
  countLoadingLimit: 90,
  exitDurationMs: 900, // pixel dissolve
  previewDurationMs: 2500, // dev-only #preview=1 minimum display
  reducedMotionExitDurationMs: 150,
} as const;
