import { useThree } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { Vector3, type Camera } from 'three'
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib'

function formatVec3(v: Vector3) {
  return `[${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}]`
}

function getCameraSnapshot(
  camera: Camera,
  controls: OrbitControlsInstance | null
) {
  const position = camera.position
  const lookAt = camera.getWorldDirection(new Vector3())
  const target = controls?.target

  return {
    position: formatVec3(position),
    lookAt: formatVec3(lookAt),
    target: target ? formatVec3(target) : 'n/a',
  }
}

export function CameraLogger({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsInstance | null>
}) {
  const { camera } = useThree()

  useControls('Camera Debug', {
    copyCameraConfig: button(() => {
      const snapshot = getCameraSnapshot(camera, controlsRef.current)

      const text = `camera: {
        position: ${snapshot.position},
        lookAt: ${snapshot.lookAt},
        target: ${snapshot.target},
        }`

      console.log(text)
      navigator.clipboard?.writeText(text)
    }),
  })

  return null
}