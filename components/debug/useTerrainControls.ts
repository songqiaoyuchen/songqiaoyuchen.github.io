import { useControls } from 'leva';
import {TERRAIN_MATERIAL_CONFIG} from '@/config/scene';

export function useTerrainControls() {
  const terrain = useControls('Terrain', {
    elevation: {
      value: TERRAIN_MATERIAL_CONFIG.elevation,
      min: 0.5, max: 40, step: 0.1,
      label: 'Elevation',
    },
    seaLevel: {
      value: TERRAIN_MATERIAL_CONFIG.seaLevel,
      min: 0, max: 1, step: 0.01,
      label: 'Sea Level',
    },
    baseColor:  { value: TERRAIN_MATERIAL_CONFIG.baseColor,  label: 'Base Color'  },
    ridgeColor: { value: TERRAIN_MATERIAL_CONFIG.ridgeColor, label: 'Ridge Color' },
    shadowStrength: {
      value: TERRAIN_MATERIAL_CONFIG.shadowStrength,
      min: 0, max: 1, step: 0.01,
      label: 'Shadow Strength',
    },
    shadowBias: {
      value: TERRAIN_MATERIAL_CONFIG.shadowBias,
      min: 0.01, max: 0.4, step: 0.01,
      label: 'Shadow Bias',
    },
  });

  const light1 = useControls('Point Light 1', {
    lightColor: { value: TERRAIN_MATERIAL_CONFIG.lightColor, label: 'Color' },
    lightX: {
      value: TERRAIN_MATERIAL_CONFIG.lightX,
      min: -11, max: 11, step: 0.1,
      label: 'X',
    },
    lightY: {
      value: TERRAIN_MATERIAL_CONFIG.lightY,
      min: -1, max: 15, step: 0.1,
      label: 'Y',
    },
    lightZ: {
      value: TERRAIN_MATERIAL_CONFIG.lightZ,
      min: -11, max: 11, step: 0.1,
      label: 'Z',
    },
    lightIntensity: {
      value: TERRAIN_MATERIAL_CONFIG.lightIntensity,
      min: 0, max: 4, step: 0.05,
      label: 'Intensity',
    },
    lightFalloff: {
      value: TERRAIN_MATERIAL_CONFIG.lightFalloff,
      min: 0.001, max: 0.2, step: 0.001,
      label: 'Falloff',
    },
  });

  const light2 = useControls('Point Light 2', {
    light2Color: { value: TERRAIN_MATERIAL_CONFIG.light2Color, label: 'Color' },
    light2X: {
      value: TERRAIN_MATERIAL_CONFIG.light2X,
      min: -11, max: 11, step: 0.1,
      label: 'X',
    },
    light2Y: {
      value: TERRAIN_MATERIAL_CONFIG.light2Y,
      min: -1, max: 15, step: 0.1,
      label: 'Y',
    },
    light2Z: {
      value: TERRAIN_MATERIAL_CONFIG.light2Z,
      min: -11, max: 11, step: 0.1,
      label: 'Z',
    },
    light2Intensity: {
      value: TERRAIN_MATERIAL_CONFIG.light2Intensity,
      min: 0, max: 4, step: 0.05,
      label: 'Intensity',
    },
    light2Falloff: {
      value: TERRAIN_MATERIAL_CONFIG.light2Falloff,
      min: 0.001, max: 0.2, step: 0.001,
      label: 'Falloff',
    },
  });

  return { ...terrain, ...light1, ...light2 };
}
