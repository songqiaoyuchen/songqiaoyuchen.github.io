// Leva "Config > Save Camera" button (dev only): stores the orbit camera as the current section's pose.
import {useThree} from '@react-three/fiber';
import {button, useControls} from 'leva';
import {useEffect, useRef} from 'react';
import {PerspectiveCamera} from 'three';
import type {OrbitControls as OrbitControlsInstance} from 'three-stdlib';
import {SCENE_LAYOUT_CONFIG} from '@/config/scene';
import type {SectionId} from '@/data/sections';
import {postConfigValues} from './saveConfig';

const round3 = (value: number) => Math.round(value * 1000) / 1000;

function toTuple(vector: {x: number; y: number; z: number}): [number, number, number] {
  return [round3(vector.x), round3(vector.y), round3(vector.z)];
}

/**
 * Leva button: writes the current camera position, look-at point, and field of view
 * into the active pose in config/scene/camera.ts via `camera.`-scoped keys.
 */
export function SaveCameraButton({
  activeId,
  controlsRef,
}: {
  activeId: SectionId | null;
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
}) {
  const {camera, size} = useThree();
  // Leva registers the button once, so its click handler reads the section and viewport through a ref.
  const latest = useRef({activeId, width: size.width});
  useEffect(() => {
    latest.current = {activeId, width: size.width};
  });

  useControls('Config', {
    // config/scene/camera.ts: saves position, look-at and fov for the pose on screen (CameraRig.tsx).
    // The refs are read only when the user clicks the button.
    // eslint-disable-next-line react-hooks/refs
    'Save Camera': button(() => {
      const {activeId: section, width} = latest.current;
      const pose = section && width >= SCENE_LAYOUT_CONFIG.mobileMaxWidth
        ? section
        : width < SCENE_LAYOUT_CONFIG.mobileMaxWidth
          ? 'mobileOverview'
          : 'overview';
      const values: Record<string, unknown> = {
        [`camera.${pose}Position`]: toTuple(camera.position),
      };
      const target = controlsRef.current?.target;
      if (target) values[`camera.${pose}LookAt`] = toTuple(target);
      if (camera instanceof PerspectiveCamera) values['camera.fov'] = round3(camera.fov);
      void postConfigValues('Save Camera', values);
    }),
  });

  return null;
}
