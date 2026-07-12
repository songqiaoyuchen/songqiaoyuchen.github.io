import { useThree } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { Vector3, PerspectiveCamera } from 'three'
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib'
import { postConfigValues } from '@/lib/debug/saveConfig'

const round3 = (v: number) => Math.round(v * 1000) / 1000

function toTuple(v: Vector3): [number, number, number] {
  return [round3(v.x), round3(v.y), round3(v.z)]
}

/**
 * "Save Camera" Leva button (grouped with Save Config): writes ONLY the
 * current camera pose — position, look direction, orbit target, fov — into
 * the `camera:` block of config/terrain.ts via block-scoped keys.
 */
export function CameraLogger({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsInstance | null>
}) {
  const { camera } = useThree()

  useControls('Config', {
    // eslint-disable-next-line react-hooks/refs -- ref is read in the click handler, not during render
    'Save Camera': button(() => {
      const values: Record<string, unknown> = {
        'camera.position': toTuple(camera.position),
        'camera.lookAt': toTuple(camera.getWorldDirection(new Vector3())),
      }
      const target = controlsRef.current?.target
      if (target) values['camera.target'] = toTuple(target)
      if (camera instanceof PerspectiveCamera) values['camera.fov'] = round3(camera.fov)
      void postConfigValues('Save Camera', values)
    }),
  })

  return null
}
