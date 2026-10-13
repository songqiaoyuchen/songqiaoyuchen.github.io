// The homepage intro reveal's clock: once the preloader has gone, seconds into the intro are published through
// the camera frame state, and the home contours draw themselves in on it (contours.vert/.frag: a wave spreads
// from the summit over the ground by the worker's reach field, each line showing where the wave has passed).
// Skipped (entry on a section route, reduced motion), the clock reads long past, so the lines show whole from
// the first frame.
'use client';

import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {REVEAL_DONE_SECONDS, revealReplayCount} from '@/lib/scene/introReveal';
import {useCameraFrameState} from '../camera/CameraFrameState';

// A stalled tab (a hidden pane) must not play the whole reveal in one frame when it wakes.
const MAX_STEP_SECONDS = 1 / 30;

type IntroRevealProps = {
  /** Run the clock (the homepage intro has started); false before the intro holds the lines unrevealed. */
  play: boolean;
  /** Never play it: show the lines whole from the first frame (entry on a section route). */
  skip: boolean;
};

export function IntroReveal({play, skip}: IntroRevealProps) {
  const frameState = useCameraFrameState();
  const reducedMotion = useReducedMotion();
  const elapsed = useRef(0);
  const replays = useRef(revealReplayCount());

  // Before the camera rig's clients; the clock is read by Contours (0.2).
  useFrame((_, delta) => {
    if (replays.current !== revealReplayCount()) {
      replays.current = revealReplayCount();
      elapsed.current = 0;
    }
    if (play) elapsed.current += Math.min(delta, MAX_STEP_SECONDS);
    // The clock runs on past the wave: the last flashes decay on it.
    frameState.current.setRevealTime(skip || reducedMotion ? REVEAL_DONE_SECONDS : elapsed.current);
  }, -0.6);

  return null;
}
