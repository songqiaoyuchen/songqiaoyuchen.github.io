import { OrbitControls } from '@react-three/drei';
import { SCENE_CONFIG } from './config';

export function SceneControls() {
  const { controls } = SCENE_CONFIG;

  return (
    <OrbitControls
      enablePan={controls.enablePan}
      enableZoom={controls.enableZoom}
      enableRotate={controls.enableRotate}
      minDistance={controls.minDistance}
      maxDistance={controls.maxDistance}
      minPolarAngle={controls.minPolarAngle}
      maxPolarAngle={controls.maxPolarAngle}
      enableDamping
      dampingFactor={0.05}
      makeDefault
    />
  );
}
