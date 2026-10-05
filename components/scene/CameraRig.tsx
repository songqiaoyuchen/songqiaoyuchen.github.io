'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {MathUtils, PerspectiveCamera, Vector3} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import type {SectionId} from '@/config/navigation/linkStreams';
import {
  CAMERA_CONFIG,
  getCameraPose,
  SCENE_LAYOUT_CONFIG,
} from '@/config/scene';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {getHomeFov} from '@/lib/scene/camera';
import {artTransitionSettings} from '@/lib/scene/artTransitionSettings';
import {CameraTransition} from '@/lib/scene/cameraTransition';
import {useCameraFrameState} from './CameraFrameState';

type CameraRigProps = {
  activeId: SectionId | null;
  onPoseSettled?: (pose: SectionId | null | undefined) => void;
  controlsRef?: React.RefObject<OrbitControlsInstance | null>;
};

export function CameraRig({activeId, controlsRef, onPoseSettled}: CameraRigProps) {
  const cameraFrameState = useCameraFrameState();
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
  const poseId = activeId && (!isMobile || activeId === 'art')
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
  const artJourney = useRef(false);
  const artFogStart = useRef(0);
  const transition = useMemo(() => new CameraTransition(), []);
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
      onPoseSettled?.(poseId);
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
      artJourney.current = poseKey === 'art' || previousPoseKey.current === 'art';
      artFogStart.current = cameraFrameState.current.artFog;
      previousPoseKey.current = poseKey;
      transition.begin(
        camera,
        currentLookAt.current,
        poseId === null ? overviewReturnPosition.current : configuredPosition,
        poseId === null ? overviewReturnLookAt.current : configuredLookAt,
      );
      isAnimating.current = true;
      onPoseSettled?.(undefined);
    }

    if (isAnimating.current) {
      const settled = transition.advance(
        camera, currentLookAt.current, delta,
        artJourney.current ? artTransitionSettings.cameraSeconds : CAMERA_CONFIG.transitionSeconds,
        isReducedMotion,
      );
      controls?.target.copy(currentLookAt.current);
      if (artJourney.current) {
        // Art lies near the terrain boundary: thicken fog gradually over the flight's
        // time so the edge stays hidden. Arrival keeps it until the medium wipe releases it.
        const {progress} = transition;
        if (poseId === 'art') {
          cameraFrameState.current.setArtFog(
            MathUtils.lerp(artFogStart.current, 1, MathUtils.smootherstep(progress, 0, .7)));
        } else {
          // Departure reveals the terrain within the image dissolve, so rise sooner.
          const rise = MathUtils.lerp(artFogStart.current, 1, MathUtils.smootherstep(progress, 0, .3));
          cameraFrameState.current.setArtFog(rise * (1 - MathUtils.smootherstep(progress, .45, 1)));
        }
      }
      if (settled) {
        isAnimating.current = false;
        onPoseSettled?.(poseId);
      }
    }
    cameraFrameState.current.setTransitioning(isAnimating.current);
  // Own the final pose after development OrbitControls (-1), before cache capture (-0.5).
  }, -0.75);

  return null;
}
