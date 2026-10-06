// Backdrop wipe state: which backdrop is fading out, which is coming in, and how far along.
// Pure and node-loadable (scripts/test/test-backdrop-wipe.mjs).
export type BackdropId = 0 | 1 | 2 | 3; // terrain, oil, pencil, digital (matches the shader)
export type BackdropWipe = {from: BackdropId; to: BackdropId; progress: number};

export function settledBackdrop(backdrop: BackdropId): BackdropWipe {
  return {from: backdrop, to: backdrop, progress: 1};
}

/** Finish the visible wipe at its normal speed, then accept only the latest
 * selection. Input must not accelerate the wipe or replace either visible side. */
export function advanceBackdropWipe(
  state: BackdropWipe,
  requested: BackdropId,
  delta: number,
  reducedMotion: boolean,
  duration: number,
): BackdropWipe {
  if (reducedMotion) return settledBackdrop(requested);
  const step = Math.min(Math.max(delta, 0), .05) / duration;
  if (state.progress < 1) {
    const progress = Math.min(1, state.progress + step);
    if (progress < 1) return {...state, progress};
    state = settledBackdrop(state.to);
  }
  if (requested === state.to) return state;
  return {from: state.to, to: requested, progress: 0};
}
