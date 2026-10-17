// Homepage preloader: the real loading stages named under the mark, the hold before the intro, the bypass offer and
// exit durations. The exit on first arrival at the overview is the intro (config/scene/intro.ts): the map, the
// lines widening, and the preloader goes once the cover has lifted; elsewhere it fades.
export const PRELOADER_CONFIG = {
  // The stage under way is named once the scene's progress passes the one before (the worker's fetches:
  // lib/terrain/terrain.worker.ts; then the shaders compiled and the first frames drawn).
  stages: [
    {progress: 0.34, label: 'terrain'},
    {progress: 0.46, label: 'shell'},
    {progress: 0.56, label: 'lighting'},
    {progress: 0.78, label: 'contours'},
    {progress: 1, label: 'shaders'},
  ],
  readyLabel: 'ready',
  readyHoldMs: 300, // the scene ready, the mark held before the map sets off
  bypassDelayMs: 8000, // "Enter without terrain" appears after this
  exitDurationMs: 500, // the fade when the scene opens on a section (Preloader.css keeps the same figure)
  introTimeoutMs: 14000, // the intro exit ends by this at the latest, should the cover never report done
  previewDurationMs: 2500, // dev-only #preview=1 minimum display
  reducedMotionExitDurationMs: 150,
} as const;
