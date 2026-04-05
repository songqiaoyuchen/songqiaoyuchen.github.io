import { forwardRef, useRef } from 'react';
import { Mesh } from 'three';
import { useTexture } from '@react-three/drei';
import { GLOBE_CONFIG, SCENE_PRESETS } from './config';

interface GlobeProps {
  onClick?: () => void;
}

export const Globe = forwardRef<Mesh, GlobeProps>(({ onClick }, forwardedRef) => {
  const { radius, segments, color } = GLOBE_CONFIG;
  const texture = useTexture('/textures/2k_earth_daymap.jpg');
  
  // Default ref in case the user doesn't provide one
  const defaultRef = useRef<Mesh>(null);
  const globeRef = (forwardedRef as React.RefObject<Mesh | null>) || defaultRef;

  return (
    <mesh 
      ref={globeRef}
      position={SCENE_PRESETS.A.globePosition}
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
