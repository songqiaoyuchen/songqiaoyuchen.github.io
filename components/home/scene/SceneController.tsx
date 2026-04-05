import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, TrackballControls } from '@react-three/drei';
import { SCENE_CONFIG, SceneMode } from './config';
import { Vector3 } from 'three';
import { useRef, useEffect } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface SceneControllerProps {
  mode: SceneMode;
}

export function SceneController({ mode }: SceneControllerProps) {
  const config = SCENE_CONFIG.modes[mode];
  const { camera, controls: controlsConfig } = config;
  
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef(new Vector3(camera.target[0], camera.target[1], camera.target[2]));
  const cameraPos = useRef(new Vector3(camera.position[0], camera.position[1], camera.position[2]));
  
  const { camera: defaultCamera } = useThree();

  // We keep a state to trigger re-renders if necessary, but refs are better for animation loops.
  useEffect(() => {
    // For fixed B view, orbit rotation/zoom shouldn't carry over
    if (orbitRef.current && mode === 'B') {
      orbitRef.current.reset();
    }
  }, [mode]);

  useFrame(() => {
    // Current mode target states
    const target = SCENE_CONFIG.modes[mode].camera.target;
    const pos = SCENE_CONFIG.modes[mode].camera.position;
    targetPos.current.set(target[0], target[1], target[2]);
    cameraPos.current.set(pos[0], pos[1], pos[2]);

    if (orbitRef.current && controlsConfig.orbitEnabled) {
      // In Scene A, OrbitControls exclusively owns camera position and lookAt.
      // We only gently guide its *orbit target* during early transitions.
      orbitRef.current.target.lerp(targetPos.current, 0.05);

      // Dynamically scale rotateSpeed based on camera distance (zoom level)
      // Closer zoom = lower rotateSpeed = finer rotation control
      if (controlsConfig.minDistance && controlsConfig.maxDistance && controlsConfig.rotateSpeed) {
        const dist = defaultCamera.position.distanceTo(orbitRef.current.target);
        const { minDistance, maxDistance, rotateSpeed } = controlsConfig;
        
        // Ratio moves from 0 (closest zoom) to 1 (furthest zoom)
        const distanceRatio = Math.max(0, Math.min(1, (dist - minDistance) / (maxDistance - minDistance)));
        
        // At closest zoom, it scales down to 50% of the config rotateSpeed. 
        // At max distance, it acts at 100% config rotateSpeed.
        orbitRef.current.rotateSpeed = rotateSpeed * (0.5 + 0.8 * distanceRatio);
      }

      orbitRef.current.update();
    } else {
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
    <>
      <PerspectiveCamera makeDefault fov={camera.fov} position={camera.position} />

      {controlsConfig.orbitEnabled && (
        <>
          <OrbitControls
            ref={orbitRef}
            makeDefault
            enablePan={controlsConfig.enablePan}
            // OrbitControls zoom disabled, Trackball handles it
            enableZoom={false}
            rotateSpeed={controlsConfig.rotateSpeed}
            panSpeed={controlsConfig.panSpeed}
            minDistance={controlsConfig.minDistance}
            maxDistance={controlsConfig.maxDistance}
            minPolarAngle={controlsConfig.minPolarAngle}
            maxPolarAngle={controlsConfig.maxPolarAngle}
            enableDamping
            dampingFactor={controlsConfig.dampingFactor}
            target={camera.target}
          />
          {/* TrackballControls for zoom damping */}
          <TrackballControls
            noRotate
            noPan
            noZoom={false}
            zoomSpeed={controlsConfig.zoomSpeed ? controlsConfig.zoomSpeed * 2.5 : 1}
            dynamicDampingFactor={controlsConfig.dampingFactor * 2} // higher damping for zoom
            minDistance={controlsConfig.minDistance}
            maxDistance={controlsConfig.maxDistance}
            target={camera.target}
          />
        </>
      )}
    </>
  );
}