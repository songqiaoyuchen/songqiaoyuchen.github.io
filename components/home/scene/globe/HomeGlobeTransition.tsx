import { useFrame } from '@react-three/fiber';
import { TRANSITION_CONFIG, SCENE_PRESETS } from '../config';
import { Vector3, Mesh } from 'three';

const V_GLOBE_A = new Vector3(...SCENE_PRESETS.A.globePosition);
const V_GLOBE_B = new Vector3(...SCENE_PRESETS.B.globePosition);

interface HomeGlobeTransitionProps {
  progress: React.RefObject<number>;
  targetProgress: React.RefObject<number>;
  globeRef: React.RefObject<Mesh | null>;
}

export function HomeGlobeTransition({
  progress,
  targetProgress,
  globeRef,
}: HomeGlobeTransitionProps) {
  useFrame(() => {
    if (progress.current == null || targetProgress.current == null) return;

    // Keep transition progress smooth so scene systems can read one damped value.
    progress.current += (targetProgress.current - progress.current) * TRANSITION_CONFIG.damping;
    const p = progress.current;

    // Non-camera transition responsibility: move the globe from scene A to B.
    if (globeRef.current) {
      globeRef.current.position.lerpVectors(V_GLOBE_A, V_GLOBE_B, p);
    }
  });

  return null;
}