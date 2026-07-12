import { useControls } from 'leva';
import { TERRAIN_CONFIG } from '@/config/terrain';

const C = TERRAIN_CONFIG.contours;

export function useContourControls() {
  return useControls('Contour Lines', {
    // geometry (rebuilds the extracted tubes)
    levels: {
      value: C.levels,
      min: 8, max: 120, step: 1,
      label: 'Levels',
    },
    smoothIterations: {
      value: C.smoothIterations,
      min: 0, max: 60, step: 1,
      label: 'Field Smooth Iters',
    },
    chaikinIterations: {
      value: C.chaikinIterations,
      min: 0, max: 5, step: 1,
      label: 'Line Smooth Iters',
    },
    resampleSpacing: {
      value: C.resampleSpacing,
      min: 0.02, max: 0.25, step: 0.005,
      label: 'Point Spacing',
    },

    // look
    lift: {
      value: C.lift,
      min: 0, max: 1.5, step: 0.01,
      label: 'Lift',
    },
    depthBias: {
      value: C.depthBias,
      min: 0, max: 0.3, step: 0.005,
      label: 'Depth Bias',
    },
    majorEvery: {
      value: C.majorEvery,
      min: 2, max: 10, step: 1,
      label: 'Major Every Nth',
    },
    minorRadius: {
      value: C.minorRadius,
      min: 0.002, max: 0.08, step: 0.001,
      label: 'Minor Radius',
    },
    majorRadius: {
      value: C.majorRadius,
      min: 0.002, max: 0.12, step: 0.001,
      label: 'Major Radius',
    },
    minorColor: { value: C.minorColor, label: 'Minor Color' },
    minorIntensity: {
      value: C.minorIntensity,
      min: 0, max: 5, step: 0.05,
      label: 'Minor Intensity',
    },
    minorBase: {
      value: C.minorBase,
      min: 0, max: 1, step: 0.01,
      label: 'Minor Base',
    },
    majorColor: { value: C.majorColor, label: 'Major Color' },
    majorIntensity: {
      value: C.majorIntensity,
      min: 0, max: 5, step: 0.05,
      label: 'Major Intensity',
    },

    // pulse
    pulseColor: { value: C.pulseColor, label: 'Pulse Color' },
    pulseTint: {
      value: C.pulseTint,
      min: 0, max: 1, step: 0.01,
      label: 'Pulse Tint',
    },
    pulseSpeed: {
      value: C.pulseSpeed,
      min: 0, max: 6, step: 0.05,
      label: 'Pulse Speed',
    },
    pulseScale: {
      value: C.pulseScale,
      min: 0.05, max: 2, step: 0.01,
      label: 'Pulse Scale',
    },
    pulseSharpness: {
      value: C.pulseSharpness,
      min: 0, max: 1, step: 0.01,
      label: 'Pulse Sharpness',
    },

    // halo
    haloScale: {
      value: C.haloScale,
      min: 1, max: 8, step: 0.05,
      label: 'Halo Scale',
    },
    haloAlpha: {
      value: C.haloAlpha,
      min: 0, max: 1, step: 0.01,
      label: 'Halo Alpha',
    },

    // intro
    introDuration: {
      value: C.introDuration,
      min: 0.5, max: 10, step: 0.1,
      label: 'Intro Duration',
    },
    revealStagger: {
      value: C.revealStagger,
      min: 0, max: 1, step: 0.01,
      label: 'Reveal Stagger',
    },
    revealEdge: {
      value: C.revealEdge,
      min: 0.1, max: 6, step: 0.05,
      label: 'Reveal Edge',
    },
  });
}
