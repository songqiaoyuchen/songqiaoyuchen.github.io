import { useControls } from 'leva';
import { TERRAIN_CONFIG } from '@/config/terrain';

export function useTerrainControls() {
  const terrain = useControls('Terrain', {
    elevation: {
      value: TERRAIN_CONFIG.material.elevation,
      min: 0.5, max: 40, step: 0.1,
      label: 'Elevation',
    },
    seaLevel: {
      value: TERRAIN_CONFIG.material.seaLevel,
      min: 0, max: 1, step: 0.01,
      label: 'Sea Level',
    },
    edgeFadeWidth: {
      value: TERRAIN_CONFIG.mesh.edgeFadeWidth,
      min: 0.01, max: 0.3, step: 0.01,
      label: 'Edge Fade',
    },
    baseColor:  { value: TERRAIN_CONFIG.material.baseColor,  label: 'Base Color'  },
    ridgeColor: { value: TERRAIN_CONFIG.material.ridgeColor, label: 'Ridge Color' },
    shadowStrength: {
      value: TERRAIN_CONFIG.material.shadowStrength,
      min: 0, max: 1, step: 0.01,
      label: 'Shadow Strength',
    },
    shadowBias: {
      value: TERRAIN_CONFIG.material.shadowBias,
      min: 0.01, max: 0.4, step: 0.01,
      label: 'Shadow Bias',
    },
  });

  const light1 = useControls('Point Light 1', {
    lightColor: { value: TERRAIN_CONFIG.material.lightColor, label: 'Color' },
    lightX: {
      value: TERRAIN_CONFIG.material.lightX,
      min: -11, max: 11, step: 0.1,
      label: 'X',
    },
    lightY: {
      value: TERRAIN_CONFIG.material.lightY,
      min: -1, max: 15, step: 0.1,
      label: 'Y',
    },
    lightZ: {
      value: TERRAIN_CONFIG.material.lightZ,
      min: -11, max: 11, step: 0.1,
      label: 'Z',
    },
    lightIntensity: {
      value: TERRAIN_CONFIG.material.lightIntensity,
      min: 0, max: 4, step: 0.05,
      label: 'Intensity',
    },
    lightFalloff: {
      value: TERRAIN_CONFIG.material.lightFalloff,
      min: 0.001, max: 0.2, step: 0.001,
      label: 'Falloff',
    },
  });

  const light2 = useControls('Point Light 2', {
    light2Color: { value: TERRAIN_CONFIG.material.light2Color, label: 'Color' },
    light2X: {
      value: TERRAIN_CONFIG.material.light2X,
      min: -11, max: 11, step: 0.1,
      label: 'X',
    },
    light2Y: {
      value: TERRAIN_CONFIG.material.light2Y,
      min: -1, max: 15, step: 0.1,
      label: 'Y',
    },
    light2Z: {
      value: TERRAIN_CONFIG.material.light2Z,
      min: -11, max: 11, step: 0.1,
      label: 'Z',
    },
    light2Intensity: {
      value: TERRAIN_CONFIG.material.light2Intensity,
      min: 0, max: 4, step: 0.05,
      label: 'Intensity',
    },
    light2Falloff: {
      value: TERRAIN_CONFIG.material.light2Falloff,
      min: 0.001, max: 0.2, step: 0.001,
      label: 'Falloff',
    },
  });

  return { ...terrain, ...light1, ...light2 };
}
