// The homepage intro reveal: a wave spreads from the summit over the ground and the home contours draw themselves
// in behind it (IntroReveal drives the clock; lib/terrain/reach.ts measures the ground; contours.vert/.frag draw).

/** The reveal's time once skipped: the wave counts as long past every line. */
export const REVEAL_DONE_SECONDS = 1e4;

// Development: Leva's Replay button asks the driver to start the reveal again.
let replayRequests = 0;

export function requestRevealReplay() {
  replayRequests += 1;
}

/** The number of replays asked for so far; the driver restarts when it changes. */
export function revealReplayCount() {
  return replayRequests;
}
