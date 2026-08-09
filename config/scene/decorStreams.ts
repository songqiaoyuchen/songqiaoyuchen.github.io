export const DECOR_STREAM_CONFIG = {
  count: 24,
  mobileCount: 12,
  bounds: {
    x: [-9.5, 9.5],
    z: [-1.5, 5.5],
  },
  seed: 17,
  centerHeightBias: 0.55,
  lift: 0.075,
  energy: 0.62,
  depthLayers: 4,
  animation: {
    fallRowsPerSecond: [0.1, 2],
    packetRowsPerSecond: [0.2, 2],
    letterSwapsPerSecond: [1, 3],
  },
  compositor: {
    blurResolutionScale: 0.5,
    blurRadii: [4, 2, 1],
  },
} as const;
