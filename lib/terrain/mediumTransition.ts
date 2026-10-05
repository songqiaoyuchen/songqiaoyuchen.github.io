export type MediumId = 0 | 1 | 2 | 3; // terrain, oil, pencil, digital
export type MediumTransition = {from: MediumId; to: MediumId; progress: number};

export function settledMedium(medium: MediumId): MediumTransition {
  return {from: medium, to: medium, progress: 1};
}

/** Finish the visible wipe at its normal speed, then accept only the latest
 * selection. Input must not accelerate the wipe or replace either visible side. */
export function advanceMediumTransition(
  state: MediumTransition,
  requested: MediumId,
  delta: number,
  reducedMotion: boolean,
  duration: number,
): MediumTransition {
  if (reducedMotion) return settledMedium(requested);
  const step = Math.min(Math.max(delta, 0), .05) / duration;
  if (state.progress < 1) {
    const progress = Math.min(1, state.progress + step);
    if (progress < 1) return {...state, progress};
    state = settledMedium(state.to);
  }
  if (requested === state.to) return state;
  return {from: state.to, to: requested, progress: 0};
}
