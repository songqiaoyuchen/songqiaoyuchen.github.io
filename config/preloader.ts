// Homepage preloader timing: count-up pacing, bypass offer and exit durations. The exit on first arrival at the
// overview is the intro's descent (config/scene/intro.ts): the cover lifts and the preloader goes once the camera
// lands; elsewhere it fades.
export const PRELOADER_CONFIG = {
  bypassDelayMs: 8000, // "Enter without terrain" appears after this
  countApproachDurationMs: 8000, // count-up from 0 to countLoadingLimit while loading
  countCompletionDurationMs: 360, // final run to 100 once the scene is ready
  countLoadingLimit: 90,
  exitDurationMs: 500, // the fade when the scene opens on a section (Preloader.css keeps the same figure)
  descentTimeoutMs: 10000, // the descent exit ends by this at the latest, should the camera never report landing
  previewDurationMs: 2500, // dev-only #preview=1 minimum display
  reducedMotionExitDurationMs: 150,
} as const;
