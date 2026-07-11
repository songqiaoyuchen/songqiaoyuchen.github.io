import { useControls } from 'leva';
import { TERRAIN_CONFIG } from '@/config/terrain';

export function useTerrainControls() {
  return useControls('Terrain', {
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
    baseColor:  { value: TERRAIN_CONFIG.material.baseColor,  label: 'Base Color'  },
    ridgeColor: { value: TERRAIN_CONFIG.material.ridgeColor, label: 'Ridge Color' },
    lightAzimuth: {
      value: TERRAIN_CONFIG.material.lightAzimuth,
      min: 0, max: 360, step: 1,
      label: 'Light Azimuth',
    },
    lightElevation: {
      value: TERRAIN_CONFIG.material.lightElevation,
      min: 0, max: 90, step: 1,
      label: 'Light Elevation',
    },
    lightIntensity: {
      value: TERRAIN_CONFIG.material.lightIntensity,
      min: 0, max: 50, step: 0.05,
      label: 'Light Intensity',
    },
  });
}
