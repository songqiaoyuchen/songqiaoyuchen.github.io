import { useControls } from 'leva';
import { TERRAIN_CONFIG } from '@/config/terrain';

const S = TERRAIN_CONFIG.shell;

export function useContourControls() {
  return useControls('Contour Shell', {
    shellLift: {
      value: S.lift,
      min: 0, max: 1.5, step: 0.01,
      label: 'Shell Lift',
    },
    smoothIterations: {
      value: S.smoothIterations,
      min: 0, max: 60, step: 1,
      label: 'Smooth Iterations',
    },
    shellAlpha: {
      value: S.alpha,
      min: 0, max: 1, step: 0.01,
      label: 'Shell Alpha',
    },
    majorEvery: {
      value: S.majorEvery,
      min: 2, max: 10, step: 1,
      label: 'Major Every Nth',
    },
    thickWidth: {
      value: S.thickWidth,
      min: 0.005, max: 0.45, step: 0.005,
      label: 'Thick Width',
    },
    thickIntensity: {
      value: S.thickIntensity,
      min: 0, max: 5, step: 0.05,
      label: 'Thick Intensity',
    },
    thickColor: { value: S.thickColor, label: 'Thick Color' },
    thinDensity: {
      value: S.thinDensity,
      min: 8, max: 200, step: 1,
      label: 'Thin Density',
    },
    thinWidth: {
      value: S.thinWidth,
      min: 0.005, max: 0.45, step: 0.005,
      label: 'Thin Width',
    },
    thinIntensity: {
      value: S.thinIntensity,
      min: 0, max: 5, step: 0.05,
      label: 'Thin Intensity',
    },
    thinColor: { value: S.thinColor, label: 'Thin Color' },
    flowStrength: {
      value: S.flowStrength,
      min: 0, max: 4, step: 0.05,
      label: 'Flow Strength',
    },
    flowSpeed: {
      value: S.flowSpeed,
      min: 0, max: 1, step: 0.005,
      label: 'Flow Speed',
    },
    flowColor: { value: S.flowColor, label: 'Flow Color' },
    hoverBoost: {
      value: S.hoverBoost,
      min: 0, max: 4, step: 0.05,
      label: 'Hover Boost',
    },
  });
}
