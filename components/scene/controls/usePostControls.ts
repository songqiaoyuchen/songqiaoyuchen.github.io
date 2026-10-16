// Leva "Post" folder (dev only, hidden on About); Save Config writes every key below to config/scene/postProcessing.ts.
import { useControls } from 'leva';
import {POST_PROCESSING_CONFIG} from '@/config/scene';
import {HOME_SCENE_FOLDER} from './sectionScope';

const POST = POST_PROCESSING_CONFIG;

export function usePostControls() {
  return useControls('Post', {
    // IsolatedBloom.tsx: strength of the glow around contours, scene links and the hero name.
    bloomIntensity: {
      value: POST.bloomIntensity,
      min: 0, max: 12, step: 0.05,
      label: 'Bloom Intensity',
    },
    // IsolatedBloom.tsx: brightness a pixel needs before it glows.
    bloomThreshold: {
      value: POST.bloomThreshold,
      min: 0, max: 1, step: 0.01,
      label: 'Bloom Threshold',
    },
    // IsolatedBloom.tsx: softness of the threshold edge.
    bloomSmoothing: {
      value: POST.bloomSmoothing,
      min: 0, max: 1, step: 0.01,
      label: 'Bloom Smoothing',
    },
  }, HOME_SCENE_FOLDER);
}
