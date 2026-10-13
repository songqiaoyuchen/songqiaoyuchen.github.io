// Leva "Contour Lines" folder (dev only, hidden on About); Save Config writes every key to config/scene/contours.ts.
// Geometry keys rebuild the lines in the terrain worker; the rest are live shader uniforms.
import { button, folder, useControls } from 'leva';
import {CONTOUR_CONFIG} from '@/config/scene';
import {requestRevealReplay} from '@/lib/scene/introReveal';
import {HOME_SCENE_FOLDER} from './sectionScope';

const CONTOURS = CONTOUR_CONFIG;

export function useContourControls() {
  return useControls('Contour Lines', {
    Geometry: folder({
      // Contours.tsx (rebuild): number of elevation levels across the height range.
      levels: {
        value: CONTOURS.levels,
        min: 8, max: 120, step: 1,
        label: 'Levels',
      },
      // Contours.tsx (rebuild): smoothing passes on the height field before tracing.
      smoothIterations: {
        value: CONTOURS.smoothIterations,
        min: 0, max: 60, step: 1,
        label: 'Field Smooth',
      },
      // Contours.tsx (rebuild): corner-cutting passes on each traced line.
      chaikinIterations: {
        value: CONTOURS.chaikinIterations,
        min: 0, max: 5, step: 1,
        label: 'Line Smooth',
      },
      // Contours.tsx (rebuild): distance between line points, in world units.
      resampleSpacing: {
        value: CONTOURS.resampleSpacing,
        min: 0.02, max: 0.25, step: 0.005,
        label: 'Point Spacing',
      },
      // Contours.tsx (rebuild): random variation of the gap between levels.
      spacingJitter: {
        value: CONTOURS.spacingJitter,
        min: 0, max: 0.9, step: 0.05,
        label: 'Spacing Jitter',
      },
    }, { collapsed: false }),

    'Shadow Lines': folder({
      // Contours.tsx (rebuild): probability a major line gets a faint shadow line below it.
      shadowChance: {
        value: CONTOURS.shadowChance,
        min: 0, max: 1, step: 0.05,
        label: 'Chance',
      },
      // Contours.tsx (rebuild): gap between a major line and its shadow.
      shadowOffset: {
        value: CONTOURS.shadowOffset,
        min: 0, max: 0.5, step: 0.01,
        label: 'Offset',
      },
      // Contours.tsx: brightness of the shadow lines.
      shadowIntensity: {
        value: CONTOURS.shadowIntensity,
        min: 0, max: 1, step: 0.01,
        label: 'Intensity',
      },
    }),

    Placement: folder({
      // Contours.tsx: height of the lines above the terrain surface.
      lift: {
        value: CONTOURS.lift,
        min: 0, max: 1.5, step: 0.01,
        label: 'Lift',
      },
      // Contours.tsx: depth pull that keeps lines in front of the terrain they lie on.
      depthBias: {
        value: CONTOURS.depthBias,
        min: 0, max: 0.01, step: 0.0001,
        pad: 4,
        label: 'Depth Bias',
      },
    }, { collapsed: false }),

    Thickness: folder({
      // Contours.tsx (rebuild): every Nth level is a bright major line.
      majorEvery: {
        value: CONTOURS.majorEvery,
        min: 2, max: 10, step: 1,
        label: 'Major Every Nth',
      },
      // Contours.tsx (rebuild): no major lines below this normalized height.
      majorMinHeight: {
        value: CONTOURS.majorMinHeight,
        min: 0, max: 1, step: 0.01,
        label: 'Major Min Height',
      },
      // Contours.tsx: tube radius of the thin lines.
      minorRadius: {
        value: CONTOURS.minorRadius,
        min: 0.001, max: 0.08, step: 0.0005,
        pad: 4,
        label: 'Minor Radius',
      },
      // Contours.tsx (+ CachedTerrain digital reveal): tube radius of the major lines.
      majorRadius: {
        value: CONTOURS.majorRadius,
        min: 0.001, max: 0.12, step: 0.0005,
        pad: 4,
        label: 'Major Radius',
      },
    }),

    Color: folder({
      // Contours.tsx (+ scene links, hero name, glyph rain): colour of the thin lines.
      minorColor: { value: CONTOURS.minorColor, label: 'Minor Color' },
      // Contours.tsx: brightness of the thin lines.
      minorIntensity: {
        value: CONTOURS.minorIntensity,
        min: 0, max: 5, step: 0.05,
        label: 'Minor Intensity',
      },
      // Contours.tsx: resting brightness of the thin lines between pulses.
      minorBase: {
        value: CONTOURS.minorBase,
        min: 0, max: 1, step: 0.01,
        label: 'Minor Base',
      },
      // Contours.tsx (+ scene links, hero name, glyph rain, digital reveal): colour of the major lines.
      majorColor: { value: CONTOURS.majorColor, label: 'Major Color' },
      // Contours.tsx (+ CachedTerrain digital reveal): brightness of the major lines.
      majorIntensity: {
        value: CONTOURS.majorIntensity,
        min: 0, max: 5, step: 0.05,
        label: 'Major Intensity',
      },
    }),

    Pulse: folder({
      // Contours.tsx (+ scene links, hero name): colour of the highlight running along thin lines.
      pulseColor: { value: CONTOURS.pulseColor, label: 'Color' },
      // Contours.tsx: how strongly the pulse recolours the line.
      pulseTint: {
        value: CONTOURS.pulseTint,
        min: 0, max: 1, step: 0.01,
        label: 'Tint',
      },
      // Contours.tsx: travel speed of the pulse along the lines.
      pulseSpeed: {
        value: CONTOURS.pulseSpeed,
        min: 0, max: 6, step: 0.05,
        label: 'Speed',
      },
      // Contours.tsx: noise frequency of the pulse along each line.
      pulseScale: {
        value: CONTOURS.pulseScale,
        min: 0.05, max: 2, step: 0.01,
        label: 'Scale',
      },
      // Contours.tsx: 1 = hard-edged pulse, 0 = smooth gradient.
      pulseSharpness: {
        value: CONTOURS.pulseSharpness,
        min: 0, max: 1, step: 0.01,
        label: 'Sharpness',
      },
    }, { collapsed: false }),

    Reveal: folder({
      // Contours.tsx (rebuilds the reach field): the wave starts at the highest point within the radius of this
      // plan point.
      revealOriginX: {
        value: CONTOURS.revealOriginX,
        min: -11, max: 11, step: 0.1,
        label: 'Origin X',
      },
      revealOriginZ: {
        value: CONTOURS.revealOriginZ,
        min: -11, max: 11, step: 0.1,
        label: 'Origin Z',
      },
      revealOriginRadius: {
        value: CONTOURS.revealOriginRadius,
        min: 0, max: 10, step: 0.1,
        label: 'Origin Radius',
      },
      // IntroReveal: seconds after the intro starts before the wave sets off from the summit.
      revealDelay: {
        value: CONTOURS.revealDelay,
        min: 0, max: 3, step: 0.05,
        label: 'Delay',
      },
      // contours.vert: the wave's speed over the ground, world units per second.
      revealSpeed: {
        value: CONTOURS.revealSpeed,
        min: 0.5, max: 20, step: 0.1,
        label: 'Speed',
      },
      // contours.frag: brightness of a line ahead of the wave.
      revealGhost: {
        value: CONTOURS.revealGhost,
        min: 0, max: 1, step: 0.01,
        label: 'Ghost',
      },
      // contours.frag: from how far ahead the ghost fades in, world units.
      revealGhostUnits: {
        value: CONTOURS.revealGhostUnits,
        min: 0, max: 8, step: 0.1,
        label: 'Ghost Reach',
      },
      // contours.frag: brightness the flash behind the front adds.
      revealFlash: {
        value: CONTOURS.revealFlash,
        min: 0, max: 4, step: 0.05,
        label: 'Flash',
      },
      // contours.frag (+ .vert): over what distance behind the front the flash decays, world units.
      revealFlashUnits: {
        value: CONTOURS.revealFlashUnits,
        min: 0.1, max: 8, step: 0.1,
        label: 'Flash Reach',
      },
      // contours.vert: how much wider the tube is at the flash's peak.
      revealFlashRadius: {
        value: CONTOURS.revealFlashRadius,
        min: 0, max: 3, step: 0.05,
        label: 'Flash Width',
      },
      Replay: button(() => requestRevealReplay()),
    }, { collapsed: false }),

  }, HOME_SCENE_FOLDER);
}
