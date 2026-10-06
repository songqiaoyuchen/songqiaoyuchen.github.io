// Leva "Art Camera" panel (dev only): orbit/pan the Art pose and save it to config/scene/camera.ts.
'use client';

import {useEffect, useRef, useState} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {button, useControls, type useCreateStore} from 'leva';
import type {OrbitControls as OrbitControlsInstance} from 'three-stdlib';
import {CAMERA_CONFIG} from '@/config/scene';
import {postConfigValues} from './saveConfig';

type Props = {
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
  onEditingChange: (editing: boolean) => void;
  store: ReturnType<typeof useCreateStore>;
};

const tuple = (vector: {x: number; y: number; z: number}): [number, number, number] =>
  [vector.x, vector.y, vector.z].map((n) => Math.round(n * 1000) / 1000) as [number, number, number];

export function ArtCameraControls({controlsRef, onEditingChange, store}: Props) {
  const camera = useThree((state) => state.camera);
  const saving = useRef(false);
  const lastSync = useRef(0);
  const [status, setStatus] = useState('Not saved');
  const [{edit}, set] = useControls('Art Camera', () => ({
    // SceneCanvas.tsx: enables OrbitControls on Art and blocks the gallery underneath.
    edit: {value: false, label: 'Edit camera', onChange: onEditingChange, transient: false},
    // Live camera position; saved as artPosition in config/scene/camera.ts.
    position: {
      value: [...CAMERA_CONFIG.artPosition], step: 0.01, label: 'Position',
      onChange: (value: [number, number, number], _path, context) => {
        // Leva's mount call is marked fromPanel; it must not cut the camera's journey.
        if (!context.fromPanel || context.initial) return;
        camera.position.fromArray(value);
        controlsRef.current?.update();
      },
    },
    // Live OrbitControls target; saved as artLookAt in config/scene/camera.ts.
    target: {
      value: [...CAMERA_CONFIG.artLookAt], step: 0.01, label: 'Look at',
      onChange: (value: [number, number, number], _path, context) => {
        if (!context.fromPanel || context.initial) return;
        controlsRef.current?.target.fromArray(value);
        controlsRef.current?.update();
      },
    },
    // Restores the pose last saved in config/scene/camera.ts.
    'Reset to saved view': button(() => {
      camera.position.fromArray(CAMERA_CONFIG.artPosition);
      controlsRef.current?.target.fromArray(CAMERA_CONFIG.artLookAt);
      controlsRef.current?.update();
    }),
    // app/api/dev-config: writes artPosition/artLookAt to config/scene/camera.ts.
    'Save Art View': button(async () => {
      const target = controlsRef.current?.target;
      if (!target || saving.current) return;
      saving.current = true;
      setStatus('Saving...');
      const saved = await postConfigValues('Save Art View', {
        'camera.artPosition': tuple(camera.position),
        'camera.artLookAt': tuple(target),
      });
      setStatus(saved ? 'Saved to camera.ts' : 'Save failed; retry');
      saving.current = false;
    }),
    // Read-only save feedback.
    status: {value: 'Not saved', label: 'Status', editable: false},
  }), {collapsed: false}, {store}, [camera, controlsRef, onEditingChange]);

  useEffect(() => () => onEditingChange(false), [onEditingChange]);

  useFrame(({clock}) => {
    if (clock.elapsedTime - lastSync.current < 0.15) return;
    lastSync.current = clock.elapsedTime;
    const target = controlsRef.current?.target;
    if (target) set({position: tuple(camera.position), target: tuple(target)});
  });

  useEffect(() => {
    if (edit) set({status: 'Not saved'});
  }, [edit, set]);

  useEffect(() => set({status}), [set, status]);

  return null;
}
