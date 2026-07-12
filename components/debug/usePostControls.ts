import { useControls } from 'leva';
import { TERRAIN_CONFIG } from '@/config/terrain';

const P = TERRAIN_CONFIG.post;

export function usePostControls() {
  return useControls('Post', {
    bloomIntensity: {
      value: P.bloomIntensity,
      min: 0, max: 12, step: 0.05,
      label: 'Bloom Intensity',
    },
    bloomThreshold: {
      value: P.bloomThreshold,
      min: 0, max: 1, step: 0.01,
      label: 'Bloom Threshold',
    },
    bloomSmoothing: {
      value: P.bloomSmoothing,
      min: 0, max: 1, step: 0.01,
      label: 'Bloom Smoothing',
    },
  });
}
