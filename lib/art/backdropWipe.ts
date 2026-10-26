// Backdrop wipe state: which backdrop is fading out, which is coming in, and how far along.
// Pure and node-loadable (scripts/test/test-backdrop-wipe.mjs).
export type BackdropId = 0 | 1 | 2 | 3; // terrain, oil, pencil, digital (matches the shader)
export type BackdropWipe = {from: BackdropId; to: BackdropId; progress: number};

export function settledBackdrop(backdrop: BackdropId): BackdropWipe {
  return {from: backdrop, to: backdrop, progress: 1};
}

/**
 * Advance the wipe toward the latest request without ever replacing either visible side mid-wipe (the front
 * only moves): a request for the incoming backdrop lets the wipe run on; one for the outgoing backdrop runs the
 * front back up at the same speed, so a selection undone is undone in place; one for a third backdrop resolves
 * the wipe the short way (back if under half-way, on if over) at the catch-up pace, so the remaining front
 * travel takes at most `catchUpSeconds`, and the new wipe starts at once. Rapid selections thus follow within the
 * catch-up time instead of waiting out the whole wipe.
 */
export function advanceBackdropWipe(
  state: BackdropWipe,
  requested: BackdropId,
  delta: number,
  reducedMotion: boolean,
  duration: number,
  catchUpSeconds = duration,
): BackdropWipe {
  if (reducedMotion) return settledBackdrop(requested);
  const step = Math.min(Math.max(delta, 0), .05) / duration;
  if (state.from !== state.to) {
    if (requested === state.to) {
      const progress = Math.min(1, state.progress + step);
      if (progress < 1) return {...state, progress};
      state = settledBackdrop(state.to);
    } else if (requested === state.from) {
      const progress = Math.max(0, state.progress - step);
      if (progress > 0) return {...state, progress};
      state = settledBackdrop(state.from);
    } else {
      const pace = step * Math.max(1, duration / Math.max(catchUpSeconds, 1e-6));
      if (state.progress <= .5) {
        const progress = Math.max(0, state.progress - pace);
        if (progress > 0) return {...state, progress};
        state = settledBackdrop(state.from);
      } else {
        const progress = Math.min(1, state.progress + pace);
        if (progress < 1) return {...state, progress};
        state = settledBackdrop(state.to);
      }
    }
  }
  if (requested === state.to) return state;
  return {from: state.to, to: requested, progress: 0};
}
