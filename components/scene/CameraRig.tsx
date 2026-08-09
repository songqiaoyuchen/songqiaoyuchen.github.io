'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {PerspectiveCamera, Vector3} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import type {SectionId} from '@/config/navigation/linkStreams';
import {
  CAMERA_CONFIG,
  getCameraPose,
  SCENE_LAYOUT_CONFIG,
} from '@/config/scene';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {getHomeFov} from '@/lib/scene/camera';

type CameraRigProps = {
  activeId: SectionId | null;
  controlsRef?: React.RefObject<OrbitControlsInstance | null>;
};

const SETTLE_EPSILON = 0.0001;

export function CameraRig({activeId, controlsRef}: CameraRigProps) {
  const isReducedMotion = useReducedMotion();
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const isMobile = viewportWidth < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const coverFov = useMemo(
    () => getHomeFov(
      viewportWidth,
      viewportHeight,
      CAMERA_CONFIG.fov,
      SCENE_LAYOUT_CONFIG,
    ),
    [viewportHeight, viewportWidth],
  );
  const poseId = activeId && !isMobile
    ? activeId
    : null;
  const poseKey = poseId ?? (isMobile ? 'mobile-overview' : 'overview');
  const configuredPose = getCameraPose(poseId, isMobile);
  const configuredPosition = useMemo(
    () => new Vector3(...configuredPose.position),
    [configuredPose.position],
  );
  const configuredLookAt = useMemo(
    () => new Vector3(...configuredPose.lookAt),
    [configuredPose.lookAt],
  );
  const initialOverviewPose = getCameraPose(null, isMobile);
  const previousPoseKey = useRef(poseKey);
  const isAnimating = useRef(false);
  const initialized = useRef(false);
  const currentLookAt = useRef(new Vector3(...initialOverviewPose.lookAt));
  const overviewReturnPosition = useRef(new Vector3(...initialOverviewPose.position));
  const overviewReturnLookAt = useRef(new Vector3(...initialOverviewPose.lookAt));

  useFrame(({ camera }, delta) => {
    const controls = controlsRef?.current;

    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - coverFov) >= 0.001) {
      camera.fov = coverFov;
      camera.updateProjectionMatrix();
    }

    if (!initialized.current) {
      camera.position.copy(configuredPosition);
      currentLookAt.current.copy(configuredLookAt);
      camera.lookAt(currentLookAt.current);
      controls?.target.copy(currentLookAt.current);
      initialized.current = true;
    } else if (!isAnimating.current && controls) {
      currentLookAt.current.copy(controls.target);
    }

    if (poseKey !== previousPoseKey.current) {
      if (poseId !== null) {
        if (previousPoseKey.current === 'overview') {
          overviewReturnPosition.current.copy(camera.position);
          overviewReturnLookAt.current.copy(controls?.target ?? currentLookAt.current);
        } else if (previousPoseKey.current === 'mobile-overview') {
          const desktopOverviewPose = getCameraPose(null);
          overviewReturnPosition.current.fromArray(desktopOverviewPose.position);
          overviewReturnLookAt.current.fromArray(desktopOverviewPose.lookAt);
        }
      } else if (isMobile || previousPoseKey.current === 'mobile-overview') {
        overviewReturnPosition.current.copy(configuredPosition);
        overviewReturnLookAt.current.copy(configuredLookAt);
      }
      previousPoseKey.current = poseKey;
      isAnimating.current = true;
    }

    if (isAnimating.current) {
      const destinationPosition = poseId === null
        ? overviewReturnPosition.current
        : configuredPosition;
      const destinationLookAt = poseId === null
        ? overviewReturnLookAt.current
        : configuredLookAt;
      const alpha = isReducedMotion ? 1 : 1 - Math.exp(-CAMERA_CONFIG.damping * delta);

      camera.position.lerp(destinationPosition, alpha);
      currentLookAt.current.lerp(destinationLookAt, alpha);
      camera.lookAt(currentLookAt.current);
      controls?.target.copy(currentLookAt.current);

      if (
        camera.position.distanceToSquared(destinationPosition) < SETTLE_EPSILON &&
        currentLookAt.current.distanceToSquared(destinationLookAt) < SETTLE_EPSILON
      ) {
        camera.position.copy(destinationPosition);
        currentLookAt.current.copy(destinationLookAt);
        camera.lookAt(currentLookAt.current);
        controls?.target.copy(currentLookAt.current);
        isAnimating.current = false;
      }
    }
  }, -2);

  return null;
}
