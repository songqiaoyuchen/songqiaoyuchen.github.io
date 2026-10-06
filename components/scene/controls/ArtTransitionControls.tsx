// Leva "Art Transition" folder (dev only): live journey/wipe/fog timing, saved across three config files.
'use client';

import {useEffect, useState} from 'react';
import {button, useControls, type useCreateStore} from 'leva';
import {artTransitionSettings} from '@/lib/art/transitionSettings';
import {postConfigValues} from './saveConfig';

/** Retunes Art journey timing and flight fog live; values persist across Art visits. */
export function ArtTransitionControls({store}: {store: ReturnType<typeof useCreateStore>}) {
  const [status, setStatus] = useState('Not saved');
  const [, set] = useControls('Art Transition', () => ({
    // CameraRig.tsx: duration of camera journeys to and from Art (camera.ts artTransitionSeconds).
    camera: {
      value: artTransitionSettings.cameraSeconds, min: 0.2, max: 12, step: 0.1, label: 'Camera (s)',
      onChange: (value: number) => {
        artTransitionSettings.cameraSeconds = value;
      },
    },
    // CachedTerrain.tsx: duration of the backdrop wipe (art/backdrop.ts revealSeconds).
    reveal: {
      value: artTransitionSettings.revealSeconds, min: 0.2, max: 12, step: 0.1, label: 'Medium wipe (s)',
      onChange: (value: number) => {
        artTransitionSettings.revealSeconds = value;
      },
    },
    // SceneFog.tsx: fog start distance during Art journeys (fog.ts flightNear).
    fogNear: {
      value: artTransitionSettings.flightFogNear, min: 0, max: 20, step: 0.5, label: 'Flight fog near',
      onChange: (value: number) => {
        artTransitionSettings.flightFogNear = value;
      },
    },
    // SceneFog.tsx: fog end distance during Art journeys (fog.ts flightFar).
    fogFar: {
      value: artTransitionSettings.flightFogFar, min: 2, max: 50, step: 0.5, label: 'Flight fog far',
      onChange: (value: number) => {
        artTransitionSettings.flightFogFar = value;
      },
    },
    // CachedTerrain.tsx: time the flight fog takes to clear after arrival (art/backdrop.ts fogReleaseSeconds).
    fogRelease: {
      value: artTransitionSettings.fogReleaseSeconds, min: 0.2, max: 6, step: 0.1, label: 'Fog release (s)',
      onChange: (value: number) => {
        artTransitionSettings.fogReleaseSeconds = value;
      },
    },
    // app/api/dev-config: writes the five values above to camera.ts, art/backdrop.ts and fog.ts.
    'Save transition': button(async () => {
      setStatus('Saving...');
      const saved = await postConfigValues('Save Art transition', {
        'camera.artTransitionSeconds': artTransitionSettings.cameraSeconds,
        'backdrop.revealSeconds': artTransitionSettings.revealSeconds,
        'backdrop.fogReleaseSeconds': artTransitionSettings.fogReleaseSeconds,
        'fog.flightNear': artTransitionSettings.flightFogNear,
        'fog.flightFar': artTransitionSettings.flightFogFar,
      });
      setStatus(saved ? 'Saved to config' : 'Save failed; retry');
    }),
    // Read-only save feedback.
    status: {value: 'Not saved', label: 'Status', editable: false},
  }), {collapsed: false}, {store}, []);

  useEffect(() => set({status}), [set, status]);

  return null;
}
