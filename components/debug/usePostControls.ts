import { useControls } from 'leva';
import {POST_PROCESSING_CONFIG} from '@/config/scene';

const POST = POST_PROCESSING_CONFIG;

export function usePostControls() {
  return useControls('Post', {
    bloomIntensity: {
      value: POST.bloomIntensity,
      min: 0, max: 12, step: 0.05,
      label: 'Bloom Intensity',
    },
    bloomThreshold: {
      value: POST.bloomThreshold,
      min: 0, max: 1, step: 0.01,
      label: 'Bloom Threshold',
    },
    bloomSmoothing: {
      value: POST.bloomSmoothing,
      min: 0, max: 1, step: 0.01,
      label: 'Bloom Smoothing',
    },
  });
}
