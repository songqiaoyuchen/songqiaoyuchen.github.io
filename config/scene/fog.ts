// Scene distance fog, plus the denser "flight fog" used on camera journeys to and from Art.
export const FOG_CONFIG = {
  color: '#0a0a0a', // matches --color-background
  near: 7.5,
  far: 21,
  // Denser fog while the camera flies near the terrain boundary to or from Art.
  flightNear: 4,
  flightFar: 14,
} as const;
