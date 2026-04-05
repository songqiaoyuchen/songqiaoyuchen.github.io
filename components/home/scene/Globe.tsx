import { SCENE_CONFIG } from './config';

export function Globe() {
  const { radius, position, segments, color } = SCENE_CONFIG.globe;

  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, segments, segments]} />
      <meshStandardMaterial 
        color={color} 
        roughness={0.6} 
        metalness={0.2} 
      />
    </mesh>
  );
}
