// Travel photo viewer: the track's spring, framing and input thresholds (components/travel/usePhotoTrack.ts).
// Imported with a relative .ts path by lib/travel/photoTrack.ts so node tests can load it.
import {CAROUSEL_CONFIG} from '../art/carousel.ts';

export const PHOTO_VIEWER_CONFIG = {
  // Art's carousel spring, so the two galleries move alike.
  spring: CAROUSEL_CONFIG.spring,
  // Largest share of the stage the current photo may fill; phones give it more of the width.
  frame: {
    wide: {width: 0.62, height: 0.94},
    narrow: {width: 0.82, height: 0.9},
  },
  // The photos either side recede to this size.
  neighborScale: 0.8,
  // Opacity by distance from the current photo: itself, its neighbours, the next ones; further out, hidden.
  opacity: [1, 0.42, 0.16, 0],
  // Space between photos (px).
  gap: 20,
  // Accumulated wheel travel (px) per step, and the pause that resets it.
  wheelStep: 45,
  wheelResetMs: 180,
  // Pointer travel (px) before a press becomes a drag, and a drag that always moves at least one photo.
  dragStart: 10,
  swipeStep: 35,
  // How far a release's speed carries the track on (ms of travel at that speed), and a still pointer's cut-off.
  flickMs: 160,
  flickStaleMs: 80,
  // How far past the first or last photo a drag may pull, in photos.
  overscroll: 0.25,
  // The caption keeps room for this many description lines at its usual measure (ch); a description that would need
  // more widens just enough to fit them instead of pushing the photo up. Slack covers words that do not fill a line.
  description: {measure: 60, lines: 4, slack: 1.1},
} as const;
