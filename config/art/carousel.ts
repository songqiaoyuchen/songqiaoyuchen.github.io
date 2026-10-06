// Selected-works carousel: spring, framing and input thresholds (used by components/art/selected).
// Imported with a relative .ts path by lib/art/carouselLayout.ts so node tests can load it.
export const CAROUSEL_CONFIG = {
  // Critically damped: retargeting keeps the current velocity, so rapid input
  // reads as one continuous rotation instead of a restart per step.
  spring: {stiffness: 140, damping: 24, restDelta: 0.0005, restSpeed: 0.005},
  // Largest share of the stage the selected work may fill. Vertical layouts
  // leave the right edge clear for the swipe rail.
  frame: {
    horizontal: {width: 0.66, height: 0.88},
    vertical: {width: 0.76, height: 0.6},
  },
  // Neighbours recede so the selected work clearly dominates, even beside same-sized works.
  neighborScale: 0.8,
  neighborOpacity: 0.42,
  // Gap between neighbours: share of the moving work's length, plus a fixed margin (px).
  neighborSpacing: 0.4,
  neighborGap: 20,
  // Accumulated wheel travel (px) per step, and the pause that resets it.
  wheelStep: 45,
  wheelResetMs: 180,
  // Pointer travel (px) before a press becomes a drag, and that turns a drag into a step.
  dragStart: 10,
  swipeStep: 35,
} as const;
