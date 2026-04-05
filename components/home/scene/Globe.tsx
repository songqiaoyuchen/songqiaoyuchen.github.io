import { forwardRef, useRef } from 'react';
import { Mesh, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { GLOBE_CONFIG, SCENE_PRESETS, SceneMode } from './config';

interface GlobeProps {
  mode: SceneMode;
  onClick?: () => void;
}

export const Globe = forwardRef<Mesh, GlobeProps>(({ mode, onClick }, forwardedRef) => {
  const { radius, segments, color } = GLOBE_CONFIG;
  const config = SCENE_PRESETS[mode];

  const texture = useTexture('/textures/2k_earth_daymap.jpg');
  
  // Default ref in case the user doesn't provide one
  const defaultRef = useRef<Mesh>(null);
  
  // We expect forwardRef to be a MutableRefObject from the parent
  const globeRef = (forwardedRef as React.MutableRefObject<Mesh>) || defaultRef;
  
  // Create a target position vector derived from the current scene mode config
  const targetPos = useRef(new Vector3(...config.globePosition));

  useFrame(() => {
    const mesh = globeRef.current;
    if (mesh) {
      const pos = SCENE_PRESETS[mode].globePosition;
      targetPos.current.set(pos[0], pos[1], pos[2]);
      // Softly lerp to target position over time
      mesh.position.lerp(targetPos.current, 0.05);
    }
  });

  return (
    <mesh 
      ref={globeRef}
      position={config.globePosition}
      onClick={(e) => {
        // Stop propagation and call handler if provided
        e.stopPropagation();
        onClick?.();
      }}
    >
      <sphereGeometry args={[radius, segments, segments]} />
      <meshStandardMaterial 
        map={texture}
        color={color} 
        roughness={0.6} 
        metalness={0.2} 
      />
    </mesh>
  );
});
Globe.displayName = 'Globe';
