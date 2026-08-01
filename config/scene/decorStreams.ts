export const DECOR_STREAM_CONFIG = {
  count: 24,
  bounds: {
    x: [-9.5, 9.5],
    z: [-1.5, 5.5],
  },
  seed: 17,
  lift: 0.075,
  energy: 0.62,
  depthLayers: 4,
  animation: {
    tickRate: 12,
    fallRowsPerSecond: [0.9, 1.5],
    swapsPerSecond: [0.35, 0.8],
  },
  compositor: {
    resolutionScale: 0.5,
    blurScale: 0.2,
  },
} as const;
