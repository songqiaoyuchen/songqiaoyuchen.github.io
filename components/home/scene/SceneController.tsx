import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { SCENE_PRESETS, SceneMode } from './config';
import { Vector3 } from 'three';
import { useRef } from 'react';

interface SceneControllerProps {
  mode: SceneMode;
}

export function SceneController({ mode }: SceneControllerProps) {
  const config = SCENE_PRESETS[mode];
  
  const targetPos = useRef(new Vector3(config.cameraTarget[0], config.cameraTarget[1], config.cameraTarget[2]));
  const cameraPos = useRef(new Vector3(config.cameraPosition[0], config.cameraPosition[1], config.cameraPosition[2]));
  
  const { camera: defaultCamera } = useThree();

  useFrame(() => {
    // Current mode target states
    const target = SCENE_PRESETS[mode].cameraTarget;
    const pos = SCENE_PRESETS[mode].cameraPosition;
    targetPos.current.set(target[0], target[1], target[2]);
    cameraPos.current.set(pos[0], pos[1], pos[2]);

    if (mode === 'B') {
      // In Scene B, no OrbitControls exists, so we explicitly own the camera here.
      // Softly interpolate camera position toward the target mode configuration
      defaultCamera.position.lerp(cameraPos.current, 0.05);
      
      // We manually construct the target for the camera to look at, easing it continuously.
      const currentLookAt = new Vector3(0, 0, -1)
        .applyQuaternion(defaultCamera.quaternion)
        .add(defaultCamera.position);
        
      currentLookAt.lerp(targetPos.current, 0.05);
      defaultCamera.lookAt(currentLookAt);
    }
  });

  return (
    <PerspectiveCamera makeDefault fov={config.cameraFov} position={config.cameraPosition} />
  );
}