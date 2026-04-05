import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, TrackballControls } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import { SCENE_PRESETS, SceneMode } from './config';
import { GlobeDragController } from './GlobeDragController';

interface SceneInteractionControllerProps {
  mode: SceneMode;
  globeRef: React.RefObject<any>;
}

export function SceneInteractionController({ mode, globeRef }: SceneInteractionControllerProps) {
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef(new Vector3());
  const { camera: defaultCamera } = useThree();

  useEffect(() => {
    // For fixed B view, orbit rotation/zoom shouldn't carry over
    if (orbitRef.current && mode === 'B') {
      orbitRef.current.reset();
    }
  }, [mode]);

  useFrame(() => {
    if (mode === 'A' && orbitRef.current) {
      const modeConfig = SCENE_PRESETS.A;
      const target = modeConfig.cameraTarget;
      targetPos.current.set(target[0], target[1], target[2]);

      // In Scene A, OrbitControls exclusively owns camera position and lookAt.
      // We only gently guide its *orbit target* during early transitions.
      orbitRef.current.target.lerp(targetPos.current, 0.05);

      const interaction = modeConfig.interaction;
      if (interaction.type === 'orbit' && interaction.minDistance && interaction.maxDistance && interaction.rotateSpeed) {
        const dist = defaultCamera.position.distanceTo(orbitRef.current.target);
        
        const distanceRatio = Math.max(0, Math.min(1, (dist - interaction.minDistance) / (interaction.maxDistance - interaction.minDistance)));
        
        orbitRef.current.rotateSpeed = interaction.rotateSpeed * (0.5 + 0.8 * distanceRatio);
      }

      orbitRef.current.update();
    }
  });

  return (
    <>
      {mode === 'A' && SCENE_PRESETS.A.interaction.type === 'orbit' && (
        <>
          <OrbitControls
            ref={orbitRef}
            makeDefault
            enablePan={SCENE_PRESETS.A.interaction.enablePan}
            enableZoom={false} // trackball will handle zoom with damping
            rotateSpeed={SCENE_PRESETS.A.interaction.rotateSpeed}
            panSpeed={SCENE_PRESETS.A.interaction.panSpeed}
            minDistance={SCENE_PRESETS.A.interaction.minDistance}
            maxDistance={SCENE_PRESETS.A.interaction.maxDistance}
            minPolarAngle={SCENE_PRESETS.A.interaction.minPolarAngle}
            maxPolarAngle={SCENE_PRESETS.A.interaction.maxPolarAngle}
            enableDamping
            dampingFactor={SCENE_PRESETS.A.interaction.dampingFactor}
            target={SCENE_PRESETS.A.cameraTarget}
          />
          <TrackballControls
            noRotate
            noPan
            noZoom={false}
            zoomSpeed={SCENE_PRESETS.A.interaction.zoomSpeed}
            dynamicDampingFactor={SCENE_PRESETS.A.interaction.dampingFactor * 2} // higher damping for zoom
            minDistance={SCENE_PRESETS.A.interaction.minDistance}
            maxDistance={SCENE_PRESETS.A.interaction.maxDistance}
            target={SCENE_PRESETS.A.cameraTarget}
          />
        </>
      )}

      {mode === 'B' && SCENE_PRESETS.B.interaction.type === 'horizonDrag' && (
        <GlobeDragController 
          globeRef={globeRef} 
          config={SCENE_PRESETS.B.interaction}
        />
      )}
    </>
  );
}