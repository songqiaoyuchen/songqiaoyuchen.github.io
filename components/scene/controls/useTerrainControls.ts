// Leva "Terrain", "Point Light 1" and "Point Light 2" folders (dev only).
// Save Config writes every key below to config/scene/terrain.ts.
import { useControls } from 'leva';
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';

export function useTerrainControls() {
  const terrain = useControls('Terrain', {
    // TerrainMesh.tsx (+ contours, scene text): vertical scale of the landscape.
    elevation: {
      value: TERRAIN_MATERIAL_CONFIG.elevation,
      min: 0.5, max: 40, step: 0.1,
      label: 'Elevation',
    },
    // TerrainMesh.tsx (+ contours, scene text): normalized height flattened to the base.
    seaLevel: {
      value: TERRAIN_MATERIAL_CONFIG.seaLevel,
      min: 0, max: 1, step: 0.01,
      label: 'Sea Level',
    },
    // TerrainMesh.tsx + Contours.tsx: plan distance from the centre where the ground starts to fall to the
    // background, and where it is gone (the plane's edge is at 11).
    edgeFade: {
      value: [...TERRAIN_MESH_CONFIG.edgeFade] as [number, number],
      step: 0.1, joystick: false,
      label: 'Edge fade',
    },
    // TerrainMesh.tsx: colour of the low ground.
    baseColor:  { value: TERRAIN_MATERIAL_CONFIG.baseColor,  label: 'Base Color'  },
    // TerrainMesh.tsx: colour of the high ridges.
    ridgeColor: { value: TERRAIN_MATERIAL_CONFIG.ridgeColor, label: 'Ridge Color' },
    // TerrainMesh.tsx (live relight): darkness of cast terrain shadows.
    shadowStrength: {
      value: TERRAIN_MATERIAL_CONFIG.shadowStrength,
      min: 0, max: 1, step: 0.01,
      label: 'Shadow Strength',
    },
    // TerrainMesh.tsx (live relight): offset that stops surfaces shadowing themselves.
    shadowBias: {
      value: TERRAIN_MATERIAL_CONFIG.shadowBias,
      min: 0.01, max: 0.4, step: 0.01,
      label: 'Shadow Bias',
    },
  });

  const light1 = useControls('Point Light 1', {
    // TerrainMesh.tsx: tint of the primary light.
    lightColor: { value: TERRAIN_MATERIAL_CONFIG.lightColor, label: 'Color' },
    // TerrainMesh.tsx (live relight): world X of the primary light.
    lightX: {
      value: TERRAIN_MATERIAL_CONFIG.lightX,
      min: -11, max: 11, step: 0.1,
      label: 'X',
    },
    // TerrainMesh.tsx (live relight): world Y (height) of the primary light.
    lightY: {
      value: TERRAIN_MATERIAL_CONFIG.lightY,
      min: -1, max: 15, step: 0.1,
      label: 'Y',
    },
    // TerrainMesh.tsx (live relight): world Z of the primary light.
    lightZ: {
      value: TERRAIN_MATERIAL_CONFIG.lightZ,
      min: -11, max: 11, step: 0.1,
      label: 'Z',
    },
    // TerrainMesh.tsx (live relight): brightness of the primary light.
    lightIntensity: {
      value: TERRAIN_MATERIAL_CONFIG.lightIntensity,
      min: 0, max: 4, step: 0.05,
      label: 'Intensity',
    },
    // TerrainMesh.tsx (live relight): how quickly the primary light fades with distance.
    lightFalloff: {
      value: TERRAIN_MATERIAL_CONFIG.lightFalloff,
      min: 0.001, max: 0.2, step: 0.001,
      label: 'Falloff',
    },
  });

  const light2 = useControls('Point Light 2', {
    // TerrainMesh.tsx: tint of the counter light.
    light2Color: { value: TERRAIN_MATERIAL_CONFIG.light2Color, label: 'Color' },
    // TerrainMesh.tsx (live relight): world X of the counter light.
    light2X: {
      value: TERRAIN_MATERIAL_CONFIG.light2X,
      min: -11, max: 11, step: 0.1,
      label: 'X',
    },
    // TerrainMesh.tsx (live relight): world Y (height) of the counter light.
    light2Y: {
      value: TERRAIN_MATERIAL_CONFIG.light2Y,
      min: -1, max: 15, step: 0.1,
      label: 'Y',
    },
    // TerrainMesh.tsx (live relight): world Z of the counter light.
    light2Z: {
      value: TERRAIN_MATERIAL_CONFIG.light2Z,
      min: -11, max: 11, step: 0.1,
      label: 'Z',
    },
    // TerrainMesh.tsx (live relight): brightness of the counter light.
    light2Intensity: {
      value: TERRAIN_MATERIAL_CONFIG.light2Intensity,
      min: 0, max: 4, step: 0.05,
      label: 'Intensity',
    },
    // TerrainMesh.tsx (live relight): how quickly the counter light fades with distance.
    light2Falloff: {
      value: TERRAIN_MATERIAL_CONFIG.light2Falloff,
      min: 0.001, max: 0.2, step: 0.001,
      label: 'Falloff',
    },
  });

  return { ...terrain, ...light1, ...light2 };
}
