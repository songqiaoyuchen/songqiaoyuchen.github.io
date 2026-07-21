'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { usePrefersReducedMotion } from '@/components/usePrefersReducedMotion';

export const OVERVIEW_CAMERA = {
  position: TERRAIN_CONFIG.camera.position,
  target: TERRAIN_CONFIG.camera.target,
} as const;

// A conservative parallel shift left reframes the same terrain toward the
// right without changing its distance, pitch, or per-section composition.
export const FOCUSED_CAMERA = {
  position: [3.397, 13.444, -6.564] as const,
  target: [1.071, 10.028, 3.214] as const,
} as const;

type CameraRigProps = {
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
  isFocused: boolean;
};

const CAMERA_DAMPING = 4.6;
const SETTLE_EPSILON = 0.0001;

export function CameraRig({ controlsRef, isFocused }: CameraRigProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const viewportWidth = useThree((state) => state.size.width);
  const useFocusedComposition = isFocused && viewportWidth >= 768;
  const previousFocusedComposition = useRef(useFocusedComposition);
  const isAnimating = useRef(false);
  const overviewPosition = useMemo(() => new Vector3(...OVERVIEW_CAMERA.position), []);
  const overviewTarget = useMemo(() => new Vector3(...OVERVIEW_CAMERA.target), []);
  const focusedPosition = useMemo(() => new Vector3(...FOCUSED_CAMERA.position), []);
  const focusedTarget = useMemo(() => new Vector3(...FOCUSED_CAMERA.target), []);

  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (useFocusedComposition !== previousFocusedComposition.current) {
      if (useFocusedComposition) {
        overviewPosition.copy(camera.position);
        overviewTarget.copy(controls.target);
      }
      previousFocusedComposition.current = useFocusedComposition;
      isAnimating.current = true;
    }

    if (isAnimating.current) {
      const destinationPosition = useFocusedComposition ? focusedPosition : overviewPosition;
      const destinationTarget = useFocusedComposition ? focusedTarget : overviewTarget;
      const alpha = prefersReducedMotion ? 1 : 1 - Math.exp(-CAMERA_DAMPING * delta);

      camera.position.lerp(destinationPosition, alpha);
      controls.target.lerp(destinationTarget, alpha);
      controls.update();

      if (
        camera.position.distanceToSquared(destinationPosition) < SETTLE_EPSILON &&
        controls.target.distanceToSquared(destinationTarget) < SETTLE_EPSILON
      ) {
        camera.position.copy(destinationPosition);
        controls.target.copy(destinationTarget);
        controls.update();
        isAnimating.current = false;
      }
    }

    controls.enabled = !isFocused && !isAnimating.current;
  });

  return null;
}
