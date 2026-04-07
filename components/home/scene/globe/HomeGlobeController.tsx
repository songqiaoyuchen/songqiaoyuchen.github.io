import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3, Mesh, MathUtils } from 'three';
import { SCENE_PRESETS, TRANSITION_CONFIG } from '../config';
import { HomeGlobeNavController } from './HomeGlobeNavController';

const V_POS_A = new Vector3(...SCENE_PRESETS.A.cameraPosition);
const V_TARGET_A = new Vector3(...SCENE_PRESETS.A.cameraTarget);
const V_POS_B = new Vector3(...SCENE_PRESETS.B.cameraPosition);
const V_TARGET_B = new Vector3(...SCENE_PRESETS.B.cameraTarget);
const RADIUS_A = V_POS_A.distanceTo(V_TARGET_A);
const RADIUS_B = V_POS_B.distanceTo(V_TARGET_B);

interface HomeGlobeControllerProps {
  progress: React.RefObject<number>;
  globeRef: React.RefObject<Mesh | null>;
}

export function HomeGlobeController({ progress, globeRef }: HomeGlobeControllerProps) {
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const [activeMode, setActiveMode] = useState<'A' | 'B'>('A');

  useFrame(() => {
    // Determine active mode by progress threshold
    const p = progress.current || 0;
    const newMode = p < TRANSITION_CONFIG.handoffThreshold ? 'A' : 'B';
    
    if (newMode !== activeMode) {
      setActiveMode(newMode);
    }

    if (newMode === 'A' && orbitRef.current) {
      // While OrbitControls is active, its true orbital focus point must perfectly 
      // track the globe's physical position as it sinks downward into Scene B's layout.
      if (globeRef.current) {
        orbitRef.current.target.copy(globeRef.current.position);
      }

      // Linearly interpolate current radius constraint
      const currentRadius = MathUtils.lerp(RADIUS_A, RADIUS_B, p);
      orbitRef.current.minDistance = currentRadius;
      orbitRef.current.maxDistance = currentRadius;

      orbitRef.current.update();
    }
  });

  return (
    <>
      {activeMode === 'A' && SCENE_PRESETS.A.interaction.type === 'orbit' && (
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enablePan={SCENE_PRESETS.A.interaction.enablePan}
          enableZoom={false} // Zoom is purely driven by wheel transition progress
          rotateSpeed={SCENE_PRESETS.A.interaction.rotateSpeed}
          minPolarAngle={SCENE_PRESETS.A.interaction.minPolarAngle}
          maxPolarAngle={SCENE_PRESETS.A.interaction.maxPolarAngle}
          enableDamping
          dampingFactor={SCENE_PRESETS.A.interaction.dampingFactor}
        />
      )}

      {activeMode === 'B' && SCENE_PRESETS.B.interaction.type === 'horizonDrag' && globeRef && (
        <HomeGlobeNavController 
          globeRef={globeRef as any} 
          config={SCENE_PRESETS.B.interaction}
        />
      )}
    </>
  );
}