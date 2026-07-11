import type { Vector3Tuple } from 'three';


export const TERRAIN_CONFIG = {
  camera: {
    position: [5.295, 10.370, -7.092] as Vector3Tuple,
    lookAt: [-0.238, -0.032, 0.971] as Vector3Tuple,
    target: [2.771, 10.028, 3.214] as Vector3Tuple,
    fov: 50,
  },

  fog: {
    color: '#0a0a0a',
    near: 8.5,
    far: 12,
  },

  mesh: {
    position: [0, -0.5, 0] as Vector3Tuple,
    segments: 512,
    planeSize: 22,
  },

  // Holographic contour shell: a smoothed, slightly enlarged copy of the
  // terrain that floats above the base mesh and carries the glowing lines.
  shell: {
    lift: 0.06,           // world-units raised above the base surface (no XY scaling)
    smoothIterations: 8, // Laplacian passes (≈ Blender Laplacian Smooth repeat)
    smoothFactor: 1.0,    // ≈ Blender Laplacian Smooth factor
    alpha: 1.0,
    introDuration: 3.2,   // seconds
    introScanSpeed: 0.5,

    thinDensity: 100,      // contour bands across full normalized height
    thinWidth: 0.06,      // line half-width as fraction of one band
    thinIntensity: 0.45,
    thinColor: '#593fd9',

    majorEvery: 3,        // every Nth contour line is the bright major one
    thickWidth: 0.01,     // major line half-width as fraction of one major band
    thickIntensity: 1.6,
    thickColor: '#fffd7d',

    flowStrength: 1.2,
    flowSpeed: 0.12,
    flowColor: '#bfeaff',

    hoverBoost: 1.0,      // extra brightness multiplier at full hover
  },

  material: {
    elevation: 24,
    contrast: 1.8,
    seaLevel: 0.00,
    baseColor:      '#080b17',
    ridgeColor:     '#a39144',
    lightAzimuth:   0,
    lightElevation: 70,
    lightIntensity: 4,
  },
}
