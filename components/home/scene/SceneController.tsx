import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { SCENE_PRESETS, TRANSITION_CONFIG } from './config';
import { Vector3, PerspectiveCamera as PerspectiveCameraImpl, Spherical, MathUtils, Mesh } from 'three';
import { useRef } from 'react';

const V_GLOBE_A = new Vector3(...SCENE_PRESETS.A.globePosition);
const V_GLOBE_B = new Vector3(...SCENE_PRESETS.B.globePosition);
const V_CAM_B = new Vector3(...SCENE_PRESETS.B.cameraPosition);
const V_TARGET_B = new Vector3(...SCENE_PRESETS.B.cameraTarget);
const SPHERICAL_B = new Spherical().setFromVector3(V_CAM_B.clone().sub(V_TARGET_B));

interface SceneControllerProps {
  progress: React.RefObject<number>;
  targetProgress: React.RefObject<number>;
  globeRef: React.RefObject<Mesh | null>;
}

export function SceneController({ progress, targetProgress, globeRef }: SceneControllerProps) {
  const { camera: defaultCamera } = useThree();

  const wasAtHandoff = useRef(true);
  const handoffTarget = useRef(new Vector3());
  const sphericalA = useRef(new Spherical());
  
  // Temporary vectors to avoid garbage collection sweeps
  const tempTarget = useRef(new Vector3());
  const tempPos = useRef(new Vector3());
  const tempSpherical = useRef(new Spherical());

  useFrame(() => {
    if (progress.current == null || targetProgress.current == null) return;

    // 1. Smoothly damp progress
    progress.current += (targetProgress.current - progress.current) * TRANSITION_CONFIG.damping;
    const p = progress.current;

    // 2. Interpolate Globe Position
    if (globeRef?.current) {
      globeRef.current.position.lerpVectors(V_GLOBE_A, V_GLOBE_B, p);
    }
    
    // 3. Interpolate FOV immediately
    const camera = defaultCamera as PerspectiveCameraImpl;
    camera.fov = MathUtils.lerp(SCENE_PRESETS.A.cameraFov, SCENE_PRESETS.B.cameraFov, p);
    camera.updateProjectionMatrix();

    // 4. OrbitControls Phase
    if (p < TRANSITION_CONFIG.handoffThreshold) {
      wasAtHandoff.current = true;
      return; 
    }

    // 5. Cinematic Handoff Setup
    if (wasAtHandoff.current) {
      if (globeRef?.current) handoffTarget.current.copy(globeRef.current.position);
      
      tempPos.current.copy(camera.position).sub(handoffTarget.current);
      sphericalA.current.setFromVector3(tempPos.current);
      
      wasAtHandoff.current = false;
    }

    // 6. Cinematic Interpolation -> Scene B
    const normalizedP = (p - TRANSITION_CONFIG.handoffThreshold) / (1 - TRANSITION_CONFIG.handoffThreshold);
    const safeP = MathUtils.clamp(normalizedP, 0, 1);

    tempTarget.current.lerpVectors(handoffTarget.current, V_TARGET_B, safeP);
    
    const radius = MathUtils.lerp(sphericalA.current.radius, SPHERICAL_B.radius, safeP);
    const phi = MathUtils.lerp(sphericalA.current.phi, SPHERICAL_B.phi, safeP);
    const thetaDiff = MathUtils.euclideanModulo(SPHERICAL_B.theta - sphericalA.current.theta + Math.PI, Math.PI * 2) - Math.PI;
    const theta = sphericalA.current.theta + thetaDiff * safeP;

    tempSpherical.current.set(radius, phi, theta);
    camera.position.setFromSpherical(tempSpherical.current).add(tempTarget.current);
    camera.lookAt(tempTarget.current);
  });

  return (
    <PerspectiveCamera makeDefault fov={SCENE_PRESETS.A.cameraFov} position={SCENE_PRESETS.A.cameraPosition} />
  );
}