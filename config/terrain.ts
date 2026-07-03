import type { Vector3Tuple } from 'three';


export const TERRAIN_CONFIG = {
  camera: {
    position: [-7.431, 3.544, 11.618] as Vector3Tuple,
    lookAt: [0.386, 0.103, -0.917] as Vector3Tuple,
    target: [-3.542, 4.579, 2.370]as Vector3Tuple,
    fov: 50,
  },

  fog: {
    color: '#0a0a0a',
    near: 8.5,
    far: 24,
  },

  mesh: {
    position: [0, -0.5, 0] as Vector3Tuple,
    segments: 1024,
    planeSize: 22,
  },

  material: {
    elevation: 20,
    contrast: 1.8,
    seaLevel: 0.00,
    fadeEnabled: true,
    fadeHeight: 0.07,
    fadeFalloff: 100,
    baseColor:      '#080b17',
    ridgeColor:     '#a39144',
    lightAzimuth:   0,
    lightElevation: 70,
    lightIntensity: 35,
  },
}
