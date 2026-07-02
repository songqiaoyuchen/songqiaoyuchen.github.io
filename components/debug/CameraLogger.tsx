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
  const direction = camera.getWorldDirection(new Vector3())
  const target = controls?.target

  const zoom =
    'zoom' in camera && typeof camera.zoom === 'number'
      ? camera.zoom.toFixed(3)
      : 'n/a'

  return {
    position: formatVec3(position),
    direction: formatVec3(direction),
    target: target ? formatVec3(target) : 'n/a',
    zoom,
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
        target: ${snapshot.target},
        direction: ${snapshot.direction},
        zoom: ${snapshot.zoom},
        }`

      console.log(text)
      navigator.clipboard?.writeText(text)
    }),
  })

  return null
}