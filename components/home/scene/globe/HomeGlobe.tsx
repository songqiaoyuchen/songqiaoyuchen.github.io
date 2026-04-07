import { forwardRef } from 'react';
import { Mesh } from 'three';
import { useTexture } from '@react-three/drei';
import { GLOBE_CONFIG, SCENE_PRESETS } from '../config';
import { LocationDebugMarkers } from '../locations/LocationDebugMarkers';

// no props for now
type HomeGlobeProps = {};

export const HomeGlobe = forwardRef<Mesh, HomeGlobeProps>((_, ref) => {
  const { radius, segments, color } = GLOBE_CONFIG;
  const texture = useTexture('/textures/8k_earth_daymap.jpg');

  return (
    <mesh ref={ref} position={SCENE_PRESETS.A.globePosition}>
      <sphereGeometry args={[radius, segments, segments]} />
      <meshStandardMaterial map={texture} color={color} />
      {/* <LocationDebugMarkers /> */}
    </mesh>
  );
});

HomeGlobe.displayName = 'HomeGlobe';
