import type {Vector3Tuple} from 'three';

export const TERRAIN_MESH_CONFIG = {
  position: [0, -0.5, 0] as Vector3Tuple,
  segments: 512,
  planeSize: 22,
  // Normalized inward fade on every side, hiding the finite plane boundary.
  edgeFeather: 0.12,
} as const;

export const TERRAIN_MATERIAL_CONFIG = {
  elevation: 24.3,
  contrast: 1.8,
  seaLevel: 0,
  baseColor: '#080b17',
  ridgeColor: '#a39144',

  // Primary point source. Coordinates are world-space with Y up.
  lightX: 1.6,
  lightY: 7.3,
  lightZ: -0.2,
  lightColor: '#fef2ff',
  lightIntensity: 1.05,
  lightFalloff: 0.053, // tighter pool of light with a faster fall into black

  // Independently tuned counter light. It uses the same hard diffuse
  // response and terrain-shadow model as the primary.
  light2X: 7.6,
  light2Y: 7.8,
  light2Z: 1.1,
  light2Color: '#fef2ff',
  light2Intensity: 1.45,
  light2Falloff: 0.065,

  // Static terrain lighting is rebaked when any light or shadow input changes.
  shadowStrength: 0.81,
  shadowBias: 0.09,
} as const;
