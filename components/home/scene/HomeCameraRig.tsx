import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { SCENE_PRESETS, TRANSITION_CONFIG } from './config';
import { Vector3, PerspectiveCamera as PerspectiveCameraImpl, Spherical, MathUtils, Mesh } from 'three';
import { useRef } from 'react';

const V_CAM_B = new Vector3(...SCENE_PRESETS.B.cameraPosition);
const V_TARGET_B = new Vector3(...SCENE_PRESETS.B.cameraTarget);
const SPHERICAL_B = new Spherical().setFromVector3(V_CAM_B.clone().sub(V_TARGET_B));

interface HomeCameraRigProps {
  progress: React.RefObject<number>;
  globeRef: React.RefObject<Mesh | null>;
}

export function HomeCameraRig({ progress, globeRef }: HomeCameraRigProps) {
  const { camera: defaultCamera } = useThree();

  /**
   * phase A: OrbitControls owns transform, rig only adjusts FOV
   * phase B: rig takes over camera transform
   * first entry snapshots current orbit state to avoid snapping
   */
  const needsHandoffInit = useRef(true);
  const handoffTarget = useRef(new Vector3());
  const handoffSpherical = useRef(new Spherical());

  // Temporary refs avoid per-frame allocations.
  const tempTarget = useRef(new Vector3());
  const tempPos = useRef(new Vector3());
  const tempSpherical = useRef(new Spherical());

  useFrame(() => {
    if (progress.current == null) return;

    const p = progress.current;
    const camera = defaultCamera as PerspectiveCameraImpl;

    camera.fov = MathUtils.lerp(SCENE_PRESETS.A.cameraFov, SCENE_PRESETS.B.cameraFov, p);
    camera.updateProjectionMatrix();

    if (p < TRANSITION_CONFIG.handoffThreshold) {
      needsHandoffInit.current = true;
      return;
    }

    if (needsHandoffInit.current) {
      if (globeRef.current) handoffTarget.current.copy(globeRef.current.position);

      tempPos.current.copy(camera.position).sub(handoffTarget.current);
      handoffSpherical.current.setFromVector3(tempPos.current);

      needsHandoffInit.current = false;
    }

    const normalizedP = (p - TRANSITION_CONFIG.handoffThreshold) / (1 - TRANSITION_CONFIG.handoffThreshold);
    const safeP = MathUtils.clamp(normalizedP, 0, 1);

    tempTarget.current.lerpVectors(handoffTarget.current, V_TARGET_B, safeP);

    const radius = MathUtils.lerp(handoffSpherical.current.radius, SPHERICAL_B.radius, safeP);
    const phi = MathUtils.lerp(handoffSpherical.current.phi, SPHERICAL_B.phi, safeP);
    const thetaDiff = MathUtils.euclideanModulo(SPHERICAL_B.theta - handoffSpherical.current.theta + Math.PI, Math.PI * 2) - Math.PI;
    const theta = handoffSpherical.current.theta + thetaDiff * safeP;

    tempSpherical.current.set(radius, phi, theta);
    camera.position.setFromSpherical(tempSpherical.current).add(tempTarget.current);
    camera.lookAt(tempTarget.current);
  });

  return (
    <PerspectiveCamera makeDefault fov={SCENE_PRESETS.A.cameraFov} position={SCENE_PRESETS.A.cameraPosition} />
  );
}