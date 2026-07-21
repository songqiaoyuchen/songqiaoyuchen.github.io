import { folder, useControls } from 'leva';
import { TERRAIN_CONFIG } from '@/config/terrain';

export function useDescentControls() {
  const descent = useControls('Descent', {
    freeCamera: { value: false, label: 'Free Camera (debug)' },
    'Stage 2 framing': folder({
      descentEndX: {
        value: TERRAIN_CONFIG.descent.descentEndX,
        min: -11, max: 11, step: 0.1,
        label: 'Map Center X',
      },
      descentEndZ: {
        value: TERRAIN_CONFIG.descent.descentEndZ,
        min: -11, max: 11, step: 0.1,
        label: 'Map Center Z',
      },
      descentEndY: {
        value: TERRAIN_CONFIG.descent.descentEndY,
        min: 5, max: 40, step: 0.1,
        label: 'Map Height',
      },
      descentEndFov: {
        value: TERRAIN_CONFIG.descent.descentEndFov,
        min: 10, max: 60, step: 0.5,
        label: 'Map FOV',
      },
      descentEndHeading: {
        value: TERRAIN_CONFIG.descent.descentEndHeading,
        min: -180, max: 180, step: 1,
        label: 'Map Rotation',
      },
    }),
    descentBow: {
      value: TERRAIN_CONFIG.descent.descentBow,
      min: -8, max: 8, step: 0.1,
      label: 'Path Bow',
    },
    scrollScrubSeconds: {
      value: TERRAIN_CONFIG.descent.scrollScrubSeconds,
      min: 0.05, max: 2, step: 0.05,
      label: 'Scroll Scrub (s)',
    },
    fogNearEnd: {
      value: TERRAIN_CONFIG.descent.fogNearEnd,
      min: 0, max: 30, step: 0.5,
      label: 'Fog Near (map)',
    },
    fogFarEnd: {
      value: TERRAIN_CONFIG.descent.fogFarEnd,
      min: 5, max: 80, step: 0.5,
      label: 'Fog Far (map)',
    },
    streamFadeStart: {
      value: TERRAIN_CONFIG.descent.streamFadeStart,
      min: 0, max: 1, step: 0.01,
      label: 'Stream Fade Start',
    },
    streamFadeEnd: {
      value: TERRAIN_CONFIG.descent.streamFadeEnd,
      min: 0, max: 1, step: 0.01,
      label: 'Stream Fade End',
    },
  });

  return descent;
}
