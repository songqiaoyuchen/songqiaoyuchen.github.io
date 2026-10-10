// Moves the camera between section poses (overview, projects, art, blog, about, travel) and drives Art flight fog.
// On About, an entry being read gets its own framing of that checkpoint (AboutPath publishes the poses); on
// Travel, a selected trip gets the quarter-sphere framing TravelGlobe publishes.
'use client';

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {MathUtils, PerspectiveCamera, Vector3} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import {
  CAMERA_CONFIG,
  getCameraPose,
  SCENE_LAYOUT_CONFIG,
  type CameraPose,
} from '@/config/scene';
import {ABOUT_PATH_CONFIG} from '@/config/scene/aboutPath';
import {TRAVEL_CONFIG} from '@/config/scene/travel';
import type {SectionId} from '@/data/sections';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {artTransitionSettings} from '@/lib/art/transitionSettings';
import {getHomeFov} from '@/lib/scene/camera';
import {CameraTransition} from '@/lib/scene/cameraTransition';
import {useCameraFrameState} from './CameraFrameState';

type CameraRigProps = {
  activeId: SectionId | null;
  /** About checkpoint to frame, or -1 for the About pose itself. */
  aboutStop?: number;
  aboutFocusPosesRef?: MutableRefObject<readonly CameraPose[]>;
  /** Journey times into/out of About and between its entries (Leva About Path; config defaults). */
  aboutSeconds?: {journeySeconds: number; focusSeconds: number};
  /** Travel: a selected trip is framed by the pose in travelFocusPoseRef. */
  travelSelected?: boolean;
  travelFocusPoseRef?: MutableRefObject<CameraPose | null>;
  /** Journey times into/out of Travel and between its overview and a trip (Leva Travel; config defaults). */
  travelSeconds?: {journeySeconds: number; focusSeconds: number};
  onPoseSettled?: (pose: SectionId | null | undefined) => void;
  controlsRef?: React.RefObject<OrbitControlsInstance | null>;
};

export function CameraRig({
  activeId, aboutStop = -1, aboutFocusPosesRef, aboutSeconds = ABOUT_PATH_CONFIG,
  travelSelected = false, travelFocusPoseRef, travelSeconds = TRAVEL_CONFIG, controlsRef, onPoseSettled,
}: CameraRigProps) {
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
  // Phones keep the overview camera for the drawer sections; Art and Travel have their own phone poses.
  const poseId = activeId && (!isMobile || activeId === 'art' || activeId === 'travel')
    ? activeId
    : null;
  const focusStop = poseId === 'about' ? aboutStop : -1;
  const poseKey = focusStop >= 0
    ? `about:${focusStop}`
    : poseId === 'travel' && travelSelected
      ? 'travel:trip'
      : poseId ?? (isMobile ? 'mobile-overview' : 'overview');
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
  // Journeys within About (between entries) and into or out of About have their own timing.
  const aboutJourney = useRef(false);
  const aboutEntry = useRef(false);
  // Likewise Travel: between its overview and a trip, and into or out of it.
  const travelFocus = useRef(false);
  const travelEntry = useRef(false);
  const focusPosition = useMemo(() => new Vector3(), []);
  const focusLookAt = useMemo(() => new Vector3(), []);
  const artFogStart = useRef(0);
  const transition = useMemo(() => new CameraTransition(), []);
  const initialized = useRef(false);
  const awaitingFocus = useRef(false);
  const currentLookAt = useRef(new Vector3(...initialOverviewPose.lookAt));
  const overviewReturnPosition = useRef(new Vector3(...initialOverviewPose.position));
  const overviewReturnLookAt = useRef(new Vector3(...initialOverviewPose.lookAt));

  useFrame(({ camera }, delta) => {
    const controls = controlsRef?.current;

    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - coverFov) >= 0.001) {
      camera.fov = coverFov;
      camera.updateProjectionMatrix();
    }

    const focusPose = focusStop >= 0
      ? aboutFocusPosesRef?.current[focusStop]
      : poseKey === 'travel:trip' ? travelFocusPoseRef?.current ?? undefined : undefined;
    if (focusPose) {
      focusPosition.fromArray(focusPose.position);
      focusLookAt.fromArray(focusPose.lookAt);
    }

    // Opened on an About entry or a trip, the framing is published by its layer once the scene assembles it:
    // start at the section's pose and take the framing as it arrives.
    if (!initialized.current || (awaitingFocus.current && focusPose && poseKey === previousPoseKey.current)) {
      camera.position.copy(focusPose ? focusPosition : configuredPosition);
      currentLookAt.current.copy(focusPose ? focusLookAt : configuredLookAt);
      camera.lookAt(currentLookAt.current);
      controls?.target.copy(currentLookAt.current);
      awaitingFocus.current = (focusStop >= 0 || poseKey === 'travel:trip') && !focusPose;
      if (!initialized.current) onPoseSettled?.(poseId);
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
      artJourney.current = poseKey === 'art' || previousPoseKey.current === 'art';
      // Moving along the About path, between entries or back to its overview.
      aboutJourney.current = poseKey.startsWith('about') && previousPoseKey.current.startsWith('about');
      aboutEntry.current = poseKey.startsWith('about') !== previousPoseKey.current.startsWith('about');
      travelFocus.current = poseKey.startsWith('travel') && previousPoseKey.current.startsWith('travel');
      travelEntry.current = poseKey.startsWith('travel') !== previousPoseKey.current.startsWith('travel');
      artFogStart.current = cameraFrameState.current.artFog;
      previousPoseKey.current = poseKey;
      awaitingFocus.current = false;
      transition.begin(
        camera,
        currentLookAt.current,
        focusPose ? focusPosition
          : poseId === null ? overviewReturnPosition.current : configuredPosition,
        focusPose ? focusLookAt
          : poseId === null ? overviewReturnLookAt.current : configuredLookAt,
      );
      isAnimating.current = true;
      onPoseSettled?.(undefined);
    }

    if (isAnimating.current) {
      const settled = transition.advance(
        camera, currentLookAt.current, delta,
        artJourney.current ? artTransitionSettings.cameraSeconds
          : aboutJourney.current ? aboutSeconds.focusSeconds
            : aboutEntry.current ? aboutSeconds.journeySeconds
              : travelFocus.current ? travelSeconds.focusSeconds
                : travelEntry.current ? travelSeconds.journeySeconds
                  : CAMERA_CONFIG.transitionSeconds,
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
      if (travelEntry.current) {
        // Into Travel the terrain shrinks onto the globe over the journey; out of it, it grows back.
        const eased = MathUtils.smootherstep(transition.progress, 0, 1);
        cameraFrameState.current.setTravelMorph(poseId === 'travel' ? eased : 1 - eased);
      }
      if (settled) {
        isAnimating.current = false;
        onPoseSettled?.(poseId);
      }
    }
    if (!isAnimating.current) cameraFrameState.current.setTravelMorph(poseId === 'travel' ? 1 : 0);
    cameraFrameState.current.setTransitioning(isAnimating.current);
  // Own the final pose after development OrbitControls (-1), before cache capture (-0.5).
  }, -0.75);

  return null;
}
