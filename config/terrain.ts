import type { Vector3Tuple } from 'three';


export const TERRAIN_CONFIG = {
  camera: {
    position: [-7.525, 2.423, 11.453] as Vector3Tuple,
    lookAt: [-7.139, 2.526, 10.536] as Vector3Tuple,
    target: [-3.636, 3.458, 2.205] as Vector3Tuple,
    fov: 50,
  },

  fog: {
    color: '#0a0a0a',
    near: 8.5,
    far: 24,
  },

  mesh: {
    position: [0, -0.5, 0] as Vector3Tuple,
    segments: 160,
    planeSize: 22,
  },

  material: {
    elevation: 20,
    contrast: 1.8,
    seaLevel: 0.00,
    baseColor:      '#080d17',
    ridgeColor:     '#7a8a99',
    lightAzimuth:   225,
    lightElevation: 35,
    lightIntensity: 0.8,
  },
}
