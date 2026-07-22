import { folder, useControls } from 'leva';
import {CONTOUR_CONFIG} from '@/config/scene';

const CONTOURS = CONTOUR_CONFIG;

export function useContourControls() {
  return useControls('Contour Lines', {
    Geometry: folder({
      levels: {
        value: CONTOURS.levels,
        min: 8, max: 120, step: 1,
        label: 'Levels',
      },
      smoothIterations: {
        value: CONTOURS.smoothIterations,
        min: 0, max: 60, step: 1,
        label: 'Field Smooth',
      },
      chaikinIterations: {
        value: CONTOURS.chaikinIterations,
        min: 0, max: 5, step: 1,
        label: 'Line Smooth',
      },
      resampleSpacing: {
        value: CONTOURS.resampleSpacing,
        min: 0.02, max: 0.25, step: 0.005,
        label: 'Point Spacing',
      },
      spacingJitter: {
        value: CONTOURS.spacingJitter,
        min: 0, max: 0.9, step: 0.05,
        label: 'Spacing Jitter',
      },
    }, { collapsed: true }),

    'Shadow Lines': folder({
      shadowChance: {
        value: CONTOURS.shadowChance,
        min: 0, max: 1, step: 0.05,
        label: 'Chance',
      },
      shadowOffset: {
        value: CONTOURS.shadowOffset,
        min: 0, max: 0.5, step: 0.01,
        label: 'Offset',
      },
      shadowIntensity: {
        value: CONTOURS.shadowIntensity,
        min: 0, max: 1, step: 0.01,
        label: 'Intensity',
      },
    }),

    Placement: folder({
      lift: {
        value: CONTOURS.lift,
        min: 0, max: 1.5, step: 0.01,
        label: 'Lift',
      },
      depthBias: {
        value: CONTOURS.depthBias,
        min: 0, max: 0.01, step: 0.0001,
        pad: 4,
        label: 'Depth Bias',
      },
    }, { collapsed: true }),

    Thickness: folder({
      majorEvery: {
        value: CONTOURS.majorEvery,
        min: 2, max: 10, step: 1,
        label: 'Major Every Nth',
      },
      majorMinHeight: {
        value: CONTOURS.majorMinHeight,
        min: 0, max: 1, step: 0.01,
        label: 'Major Min Height',
      },
      minorRadius: {
        value: CONTOURS.minorRadius,
        min: 0.001, max: 0.08, step: 0.0005,
        pad: 4,
        label: 'Minor Radius',
      },
      majorRadius: {
        value: CONTOURS.majorRadius,
        min: 0.001, max: 0.12, step: 0.0005,
        pad: 4,
        label: 'Major Radius',
      },
    }),

    Color: folder({
      minorColor: { value: CONTOURS.minorColor, label: 'Minor Color' },
      minorIntensity: {
        value: CONTOURS.minorIntensity,
        min: 0, max: 5, step: 0.05,
        label: 'Minor Intensity',
      },
      minorBase: {
        value: CONTOURS.minorBase,
        min: 0, max: 1, step: 0.01,
        label: 'Minor Base',
      },
      majorColor: { value: CONTOURS.majorColor, label: 'Major Color' },
      majorIntensity: {
        value: CONTOURS.majorIntensity,
        min: 0, max: 5, step: 0.05,
        label: 'Major Intensity',
      },
    }),

    Pulse: folder({
      pulseColor: { value: CONTOURS.pulseColor, label: 'Color' },
      pulseTint: {
        value: CONTOURS.pulseTint,
        min: 0, max: 1, step: 0.01,
        label: 'Tint',
      },
      pulseSpeed: {
        value: CONTOURS.pulseSpeed,
        min: 0, max: 6, step: 0.05,
        label: 'Speed',
      },
      pulseScale: {
        value: CONTOURS.pulseScale,
        min: 0.05, max: 2, step: 0.01,
        label: 'Scale',
      },
      pulseSharpness: {
        value: CONTOURS.pulseSharpness,
        min: 0, max: 1, step: 0.01,
        label: 'Sharpness',
      },
    }, { collapsed: true }),

  });
}
