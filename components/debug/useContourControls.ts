import { folder, useControls } from 'leva';
import { TERRAIN_CONFIG } from '@/config/terrain';

const C = TERRAIN_CONFIG.contours;

export function useContourControls() {
  return useControls('Contour Lines', {
    Geometry: folder({
      levels: {
        value: C.levels,
        min: 8, max: 120, step: 1,
        label: 'Levels',
      },
      smoothIterations: {
        value: C.smoothIterations,
        min: 0, max: 60, step: 1,
        label: 'Field Smooth',
      },
      chaikinIterations: {
        value: C.chaikinIterations,
        min: 0, max: 5, step: 1,
        label: 'Line Smooth',
      },
      resampleSpacing: {
        value: C.resampleSpacing,
        min: 0.02, max: 0.25, step: 0.005,
        label: 'Point Spacing',
      },
    }, { collapsed: true }),

    Placement: folder({
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
    }, { collapsed: true }),

    Thickness: folder({
      majorEvery: {
        value: C.majorEvery,
        min: 2, max: 10, step: 1,
        label: 'Major Every Nth',
      },
      minorRadius: {
        value: C.minorRadius,
        min: 0.001, max: 0.08, step: 0.0005,
        pad: 4,
        label: 'Minor Radius',
      },
      majorRadius: {
        value: C.majorRadius,
        min: 0.001, max: 0.12, step: 0.0005,
        pad: 4,
        label: 'Major Radius',
      },
    }),

    Color: folder({
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
    }),

    Pulse: folder({
      pulseColor: { value: C.pulseColor, label: 'Color' },
      pulseTint: {
        value: C.pulseTint,
        min: 0, max: 1, step: 0.01,
        label: 'Tint',
      },
      pulseSpeed: {
        value: C.pulseSpeed,
        min: 0, max: 6, step: 0.05,
        label: 'Speed',
      },
      pulseScale: {
        value: C.pulseScale,
        min: 0.05, max: 2, step: 0.01,
        label: 'Scale',
      },
      pulseSharpness: {
        value: C.pulseSharpness,
        min: 0, max: 1, step: 0.01,
        label: 'Sharpness',
      },
    }, { collapsed: true }),

    Intro: folder({
      introDuration: {
        value: C.introDuration,
        min: 0.5, max: 15, step: 0.1,
        label: 'Duration',
      },
      revealStagger: {
        value: C.revealStagger,
        min: 0, max: 1, step: 0.01,
        label: 'Stagger',
      },
      revealEdge: {
        value: C.revealEdge,
        min: 0.1, max: 6, step: 0.05,
        label: 'Front Softness',
      },
    }, { collapsed: true }),
  });
}
