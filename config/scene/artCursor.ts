// Cursor treatments over the Art scene, across the whole screen. Oil smudges
// its paint out of place; pencil and Digital answer a light the cursor carries. Lengths are
// CSS pixels.
export const ART_CURSOR_CONFIG = {
  // Over the carousel or collection the light stays faint; artworks pause it.
  quietStrength: 0.35,
  // The light: a soft pool that trails the cursor, then heals away.
  touchRadius: 34,
  healSeconds: 1,
  // Resolution of the trail; the pool is soft, so it can be coarse.
  cell: 4,
  // Pointer speed at which the light is fully lit. It wakes quickly with
  // movement and dims once the cursor rests.
  fullSpeed: 500,
  wakeSeconds: 0.12,
  restSeconds: 0.6,
  // Oil: the cursor smudges the painting, dragging it along the stroke without
  // mixing its colours. The distortion then settles back.
  oil: {
    cell: 2,
    smudgeHealSeconds: 2,
    radius: 40,
    // Share of the cursor's travel the paint under the brush follows.
    smudgeDrag: 0.2,
    // Farthest the paint can be pulled from its place.
    maxPush: 28,
  },
  // Pencil: the terrain's elevation contours are cross-hatched in, evenly
  // spaced on the page, in the drawing's own pale line colour. Open sky takes
  // a plain diagonal hatch.
  pencil: {
    pencilStrength: 0.5,
    spacing: 9,
    width: 1.1,
    strokeColor: '#dcc193',
  },
  // Digital: lit dots swell, modelling slopes the scene light leaves empty and
  // filling open sky with small dots.
  dots: {
    // Digital dot spacing, shared with the compositor.
    cell: 4.5,
    dotsStrength: 0.2,
    // Dot tone on slopes that turn away from the viewer.
    shade: 0.08,
    // Dot tone the light gives open sky.
    sky: 0.12,
  },
} as const;
