// Moves the camera between section poses (overview, projects, art, blog, about, travel) and drives Art flight fog.
// A journey is one motion straight from pose to pose (lib/scene/cameraJourney.ts), its effects running over the
// whole of it. On About, an entry being read gets its own framing of that checkpoint (AboutPath publishes the
// poses); on Travel, a selected trip gets the quarter-sphere framing TravelGlobe publishes.
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
import {TRAVEL_CONFIG, TRAVEL_TRIP_CONFIG} from '@/config/scene/travel';
import type {SectionId} from '@/data/sections';
import {useTravelScene} from '@/components/travel/TravelSceneContext';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {artTransitionSettings} from '@/lib/art/transitionSettings';
import {getHomeFov} from '@/lib/scene/camera';
import {HOME, isTravelKey, planJourney, type JourneyLeg, type LegKind} from '@/lib/scene/cameraJourney';
import {CameraTransition} from '@/lib/scene/cameraTransition';
import {useCameraFrameState} from './CameraFrameState';

// Into or out of Travel (either view) and between its overview and a trip.
const TRAVEL_SECONDS = {
  journeySeconds: TRAVEL_CONFIG.journeySeconds, focusSeconds: TRAVEL_TRIP_CONFIG.focusSeconds,
};

type CameraRigProps = {
  activeId: SectionId | null;
  /** About checkpoint to frame, or -1 for the About pose itself. */
  aboutStop?: number;
  aboutFocusPosesRef?: MutableRefObject<readonly CameraPose[]>;
  /** Journey times into/out of About and between its entries (Leva About Path; config defaults). */
  aboutSeconds?: {journeySeconds: number; focusSeconds: number};
  /** Travel: a selected trip (TravelSceneContext) is framed by the pose in travelFocusPoseRef. */
  travelFocusPoseRef?: MutableRefObject<CameraPose | null>;
  /** Journey times into/out of Travel and between its overview and a trip (Leva Travel: Journey; Travel Trip:
   * Focus; config defaults). */
  travelSeconds?: {journeySeconds: number; focusSeconds: number};
  onPoseSettled?: (pose: SectionId | null | undefined) => void;
  controlsRef?: React.RefObject<OrbitControlsInstance | null>;
};

export function CameraRig({
  activeId, aboutStop = -1, aboutFocusPosesRef, aboutSeconds = ABOUT_PATH_CONFIG,
  travelFocusPoseRef, travelSeconds = TRAVEL_SECONDS, controlsRef, onPoseSettled,
}: CameraRigProps) {
  const cameraFrameState = useCameraFrameState();
  const travelSelected = useTravelScene().selectedId !== null;
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
  // The journey under way (one motion from pose to pose) and its time.
  const leg = useRef<JourneyLeg | null>(null);
  const journeySeconds = useRef(CAMERA_CONFIG.transitionSeconds as number);
  // Where the effects start, so an interrupted journey carries on from the live values.
  const artFogStart = useRef(0);
  const morphStart = useRef(0);
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

    const secondsFor = (kind: LegKind) => {
      switch (kind) {
        case 'art': return artTransitionSettings.cameraSeconds;
        case 'aboutFocus': return aboutSeconds.focusSeconds;
        case 'aboutEntry': return aboutSeconds.journeySeconds;
        case 'travelFocus': return travelSeconds.focusSeconds;
        case 'travelEntry': return travelSeconds.journeySeconds;
        default: return CAMERA_CONFIG.transitionSeconds;
      }
    };

    // The pose a key stands for; a destination's own framing where it has one.
    const resolvePose = (key: string): {position: Vector3; lookAt: Vector3} => {
      let pose: CameraPose;
      if (key === HOME) {
        // The overview is wherever the visitor left it (bookkept below).
        return {position: overviewReturnPosition.current, lookAt: overviewReturnLookAt.current};
      } else if (key.startsWith('about:')) {
        pose = aboutFocusPosesRef?.current[Number(key.slice('about:'.length))] ?? getCameraPose('about', isMobile);
      } else if (key === 'travel:trip') {
        pose = travelFocusPoseRef?.current ?? getCameraPose('travel', isMobile);
      } else {
        pose = getCameraPose(key as SectionId, isMobile);
      }
      return {position: new Vector3(...pose.position), lookAt: new Vector3(...pose.lookAt)};
    };

    if (poseKey !== previousPoseKey.current) {
      if (poseId !== null) {
        // Leaving the overview: return to where the visitor left it (not to mid-air when a return is cut short).
        if (previousPoseKey.current === 'overview' && !isAnimating.current) {
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
      // A journey cut short by a new destination sets off from where it was heading, from the live camera.
      const origin = isAnimating.current && leg.current ? leg.current.to : previousPoseKey.current;
      previousPoseKey.current = poseKey;
      leg.current = planJourney(origin, poseKey);
      journeySeconds.current = secondsFor(leg.current.kind);
      artFogStart.current = cameraFrameState.current.artFog;
      morphStart.current = cameraFrameState.current.travelMorph;
      const destination = resolvePose(leg.current.to);
      transition.begin(camera, currentLookAt.current, destination.position, destination.lookAt);
      isAnimating.current = true;
      onPoseSettled?.(undefined);
    }

    if (isAnimating.current && leg.current) {
      const settled = transition.advance(
        camera, currentLookAt.current, delta, journeySeconds.current, isReducedMotion,
      );
      controls?.target.copy(currentLookAt.current);
      // The effects go by the journey's two ends and run over its whole length (a journey from Art to Travel
      // releases the fog and morphs the terrain at once); the last frame lands exactly on their end values.
      const {progress} = transition;
      const {from, to, kind} = leg.current;
      if (from === 'art' || to === 'art') {
        // Art lies near the terrain boundary: thicken fog gradually over the flight's
        // time so the edge stays hidden. Arrival keeps it until the medium wipe releases it.
        if (to === 'art') {
          cameraFrameState.current.setArtFog(
            MathUtils.lerp(artFogStart.current, 1, MathUtils.smootherstep(progress, 0, .7)));
        } else {
          // Departure reveals the terrain within the image dissolve, so rise sooner.
          const rise = MathUtils.lerp(artFogStart.current, 1, MathUtils.smootherstep(progress, 0, .3));
          cameraFrameState.current.setArtFog(rise * (1 - MathUtils.smootherstep(progress, .45, 1)));
        }
      }
      if (isTravelKey(from) !== isTravelKey(to)) {
        // Into Travel the terrain shrinks onto the globe over the journey, from wherever the camera set off; out
        // of it, it grows back, from the overview's or a trip's framing alike.
        cameraFrameState.current.setTravelMorph(
          MathUtils.lerp(morphStart.current, isTravelKey(to) ? 1 : 0, MathUtils.smootherstep(progress, 0, 1)));
      }
      // Between Travel's overview and a trip the globe turns the trip into frame on the camera's clock.
      cameraFrameState.current.setTravelFocus(kind === 'travelFocus' ? progress : -1);
      if (settled) {
        isAnimating.current = false;
        onPoseSettled?.(poseId);
      }
    }
    if (!isAnimating.current) {
      cameraFrameState.current.setTravelMorph(poseId === 'travel' ? 1 : 0);
      cameraFrameState.current.setTravelFocus(-1);
    }
    cameraFrameState.current.setTransitioning(isAnimating.current);
  // Own the final pose after development OrbitControls (-1), before cache capture (-0.5).
  }, -0.75);

  return null;
}
