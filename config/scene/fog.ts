export const FOG_CONFIG = {
  color: '#0a0a0a',
  near: 7.5,
  far: 21,
  // Denser fog while the camera flies near the terrain boundary to or from Art.
  flightNear: 4,
  flightFar: 14,
} as const;
