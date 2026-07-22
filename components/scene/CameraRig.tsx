'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {PerspectiveCamera, Vector3} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import {CAMERA_CONFIG, SCENE_LAYOUT_CONFIG} from '@/config/scene';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {getHomeFov} from '@/lib/scene/camera';

type CameraRigProps = {
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
  isFocused: boolean;
};

const SETTLE_EPSILON = 0.0001;

export function CameraRig({ controlsRef, isFocused }: CameraRigProps) {
  const isReducedMotion = useReducedMotion();
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const coverFov = useMemo(
    () => getHomeFov(
      viewportWidth,
      viewportHeight,
      CAMERA_CONFIG.fov,
      SCENE_LAYOUT_CONFIG,
    ),
    [viewportHeight, viewportWidth],
  );
  const useFocusedComposition = isFocused && viewportWidth >= SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const previousFocusedComposition = useRef(useFocusedComposition);
  const isAnimating = useRef(false);
  const overviewPosition = useMemo(() => new Vector3(...CAMERA_CONFIG.overviewPosition), []);
  const overviewTarget = useMemo(() => new Vector3(...CAMERA_CONFIG.overviewTarget), []);
  const focusedPosition = useMemo(() => new Vector3(...CAMERA_CONFIG.focusedPosition), []);
  const focusedTarget = useMemo(() => new Vector3(...CAMERA_CONFIG.focusedTarget), []);

  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - coverFov) >= 0.001) {
      camera.fov = coverFov;
      camera.updateProjectionMatrix();
    }

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
      const alpha = isReducedMotion ? 1 : 1 - Math.exp(-CAMERA_CONFIG.damping * delta);

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
