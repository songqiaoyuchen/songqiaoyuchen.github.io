// Glyph rain: the faint falling columns of letters behind the homepage scene links.
// Layout seed, density and speeds; dev-config writes the Leva "Glyph Rain" speeds here.
export const GLYPH_RAIN_CONFIG = {
  count: 24, // columns on desktop
  mobileCount: 12,
  bounds: {
    x: [-9.5, 9.5], // world-space area the columns are scattered over
    z: [-1.5, 5.5],
  },
  seed: 17,
  centerHeightBias: 0.55, // columns near the screen centre grow taller
  lift: 0.075,
  energy: 0.62,
  depthLayers: 4, // columns are split by camera depth into separately blurred layers
  animation: {
    fallRowsPerSecond: [0.1, 2], // [min, max] per column
    packetRowsPerSecond: [0.2, 2],
    letterSwapsPerSecond: [0, 1],
  },
  compositor: {
    blurResolutionScale: 0.5,
    blurRadii: [4, 2, 1], // blur per depth layer, farthest first; the nearest stays sharp
    // The rain's own frame rate: its offscreen passes are the costliest layer on Home, and the slow, blurred
    // fall reads the same at half the display rate. 0 draws every frame.
    stepsPerSecond: 30,
  },
} as const;
