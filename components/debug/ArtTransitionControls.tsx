'use client';

import {useEffect, useState} from 'react';
import {button, useControls, type useCreateStore} from 'leva';
import {artTransitionSettings} from '@/lib/scene/artTransitionSettings';
import {postConfigValues} from '@/lib/debug/saveConfig';

/** Retunes Art journey timing and flight fog live; values persist across Art visits. */
export function ArtTransitionControls({store}: {store: ReturnType<typeof useCreateStore>}) {
  const [status, setStatus] = useState('Not saved');
  const [, set] = useControls('Art Transition', () => ({
    camera: {
      value: artTransitionSettings.cameraSeconds, min: 0.2, max: 12, step: 0.1, label: 'Camera (s)',
      onChange: (value: number) => {
        artTransitionSettings.cameraSeconds = value;
      },
    },
    reveal: {
      value: artTransitionSettings.revealSeconds, min: 0.2, max: 12, step: 0.1, label: 'Medium wipe (s)',
      onChange: (value: number) => {
        artTransitionSettings.revealSeconds = value;
      },
    },
    fogNear: {
      value: artTransitionSettings.flightFogNear, min: 0, max: 20, step: 0.5, label: 'Flight fog near',
      onChange: (value: number) => {
        artTransitionSettings.flightFogNear = value;
      },
    },
    fogFar: {
      value: artTransitionSettings.flightFogFar, min: 2, max: 50, step: 0.5, label: 'Flight fog far',
      onChange: (value: number) => {
        artTransitionSettings.flightFogFar = value;
      },
    },
    fogRelease: {
      value: artTransitionSettings.fogReleaseSeconds, min: 0.2, max: 6, step: 0.1, label: 'Fog release (s)',
      onChange: (value: number) => {
        artTransitionSettings.fogReleaseSeconds = value;
      },
    },
    'Save transition': button(async () => {
      setStatus('Saving...');
      const saved = await postConfigValues('Save Art transition', {
        'camera.artTransitionSeconds': artTransitionSettings.cameraSeconds,
        'artIllustration.revealSeconds': artTransitionSettings.revealSeconds,
        'artIllustration.fogReleaseSeconds': artTransitionSettings.fogReleaseSeconds,
        'fog.flightNear': artTransitionSettings.flightFogNear,
        'fog.flightFar': artTransitionSettings.flightFogFar,
      });
      setStatus(saved ? 'Saved to config' : 'Save failed; retry');
    }),
    status: {value: 'Not saved', label: 'Status', editable: false},
  }), {collapsed: false}, {store}, []);

  useEffect(() => set({status}), [set, status]);

  return null;
}
