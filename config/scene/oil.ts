// Approved diffuse registration; original top-left pixels.
export const OIL_TERRAIN_CONFIG = {
  crop: {x: 1494, y: 0, width: 2603, height: 3390},
  textureWidth: 2048,
  colorMap: '/textures/terrain/oil-color.webp?v=7',
  reliefMap: '/textures/terrain/oil-relief.webp?v=6',
  exposure: 0.85,
  lightThreshold: 0.14,
  lightContrast: 1.8,
  reliefStrength: 0.035,
  fogNear: 10,
  fogFar: 25,
} as const;
