import {useThree} from '@react-three/fiber';
import {button, useControls} from 'leva';
import {PerspectiveCamera} from 'three';
import type {OrbitControls as OrbitControlsInstance} from 'three-stdlib';
import {postConfigValues} from '@/lib/debug/saveConfig';

const round3 = (value: number) => Math.round(value * 1000) / 1000;

function toTuple(vector: {x: number; y: number; z: number}): [number, number, number] {
  return [round3(vector.x), round3(vector.y), round3(vector.z)];
}

/**
 * Leva button: writes current camera position, orbit target, and field of view
 * into config/scene/camera.ts via `camera.`-scoped keys.
 */
export function SaveCameraButton({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsInstance | null>
}) {
  const {camera} = useThree();

  useControls('Config', {
    // The ref is read only when the user clicks the button.
    // eslint-disable-next-line react-hooks/refs
    'Save Camera': button(() => {
      const values: Record<string, unknown> = {
        'camera.position': toTuple(camera.position),
      };
      const target = controlsRef.current?.target;
      if (target) values['camera.target'] = toTuple(target);
      if (camera instanceof PerspectiveCamera) values['camera.fov'] = round3(camera.fov);
      void postConfigValues('Save Camera', values);
    }),
  });

  return null;
}
