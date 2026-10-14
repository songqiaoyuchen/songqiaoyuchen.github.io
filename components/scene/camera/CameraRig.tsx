// Moves the camera between section poses (overview, projects, art, blog, about, travel) and drives Art flight fog.
// A journey is one motion straight from pose to pose (lib/scene/cameraJourney.ts), its effects running over the
// whole of it. On About, an entry being read gets its own framing of that checkpoint (AboutPath publishes the
// poses); on Travel, all trips and a selected trip are two poses, the trip's its quarter-sphere framing (phones add
// a third, all trips stepped back while the trip list is pulled up). The
// first frame lands on the view the route opens (a refresh on a trip stays on the trip). The homepage intro opens
// at a map pose straight above the summit (snapped to under the preloader) and, once the reveal's wave has had
// its head start, descends to the overview in one journey, publishing its progress as the frame state's
// introDescent (the ground's light and the fog follow it).
'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {MathUtils, PerspectiveCamera, Vector3, type Vector3Tuple} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import {
  CAMERA_CONFIG,
  CONTOUR_CONFIG,
  getCameraPose,
  getTravelIndexPose,
  getTravelTripPose,
  SCENE_LAYOUT_CONFIG,
  type CameraPose,
} from '@/config/scene';
import {ABOUT_MAP_CONFIG, ABOUT_PATH_CONFIG} from '@/config/scene/aboutPath';
import {TRAVEL_CONFIG, TRAVEL_OVERVIEW_CONFIG, TRAVEL_TRIP_CONFIG} from '@/config/scene/travel';
import type {SectionId} from '@/data/sections';
import {useTravelScene} from '@/components/travel/TravelSceneContext';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {artTransitionSettings} from '@/lib/art/transitionSettings';
import {getHomeFov} from '@/lib/scene/camera';
import type {AboutFraming} from '@/lib/scene/aboutPath';
import {HOME, isTravelKey, MAP, planJourney, type JourneyLeg, type LegKind} from '@/lib/scene/cameraJourney';
import {CameraTransition} from '@/lib/scene/cameraTransition';
import {mapPose} from '@/lib/scene/introDescent';
import type {IntroControlValues} from '../controls/useSceneControls';
import {useCameraFrameState} from './CameraFrameState';

// Into or out of Travel (either view) and between its overview and a trip.
const TRAVEL_SECONDS = {
  journeySeconds: TRAVEL_CONFIG.journeySeconds, focusSeconds: TRAVEL_TRIP_CONFIG.focusSeconds,
};

type CameraRigProps = {
  activeId: SectionId | null;
  /** About checkpoint to frame, or -1 for the About pose itself. */
  aboutStop?: number;
  /** Frames an About checkpoint from an About pose (AboutPath publishes it). */
  aboutFramingRef?: MutableRefObject<AboutFraming | null>;
  /** Journey times into/out of About and between its entries (Leva About Path; config defaults). */
  aboutSeconds?: {journeySeconds: number; focusSeconds: number};
  /** Journey times into/out of Travel and between its overview and a trip (Leva Travel: Journey; Travel Trip:
   * Focus; config defaults). */
  travelSeconds?: {journeySeconds: number; focusSeconds: number};
  /** The homepage intro: hold the map pose above the summit while the reveal's wave spreads (IntroReveal's
   * clock, read from the frame state), then descend to the overview. The summit (world point) is filled in by
   * Contours once the reach field names it; until then the configured origin stands in. */
  intro?: {active: boolean; summitRef: MutableRefObject<Vector3Tuple | null>; settings: IntroControlValues};
  onPoseSettled?: (pose: SectionId | null | undefined) => void;
  controlsRef?: React.RefObject<OrbitControlsInstance | null>;
};

export function CameraRig({
  activeId, aboutStop = -1, aboutFramingRef, aboutSeconds = ABOUT_PATH_CONFIG,
  travelSeconds = TRAVEL_SECONDS, intro, controlsRef, onPoseSettled,
}: CameraRigProps) {
  const cameraFrameState = useCameraFrameState();
  const {selectedId: travelSelectedId, indexOpen: travelIndexOpen} = useTravelScene();
  const travelSelected = travelSelectedId !== null;
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
  // Phones keep the overview camera for Blog and Projects; Art, About and Travel have their own phone poses.
  const poseId = activeId && (!isMobile || activeId === 'art' || activeId === 'about' || activeId === 'travel')
    ? activeId
    : null;
  const focusStop = poseId === 'about' ? aboutStop : -1;
  const poseKey = focusStop >= 0
    ? `about:${focusStop}`
    : poseId === 'travel' && travelSelected
      ? 'travel:trip'
      : poseId === 'travel' && isMobile && travelIndexOpen
        ? 'travel:index'
        : poseId ?? (isMobile ? 'mobile-overview' : 'overview');
  const configuredPose = poseKey === 'travel:trip'
    ? getTravelTripPose(isMobile)
    : poseKey === 'travel:index' ? getTravelIndexPose() : getCameraPose(poseId, isMobile);
  const configuredPosition = useMemo(
    () => new Vector3(...configuredPose.position),
    [configuredPose.position],
  );
  const configuredLookAt = useMemo(
    () => new Vector3(...configuredPose.lookAt),
    [configuredPose.lookAt],
  );
  const initialOverviewPose = getCameraPose(null, isMobile);
  // The About pose journeys start from and frame its checkpoints from: the configured one (phones have their own)
  // or, in development, the view composed with Leva's Edit camera, so the framings follow it before it is saved.
  const configuredAbout = getCameraPose('about', isMobile);
  const aboutBase = useRef<CameraPose>(configuredAbout);
  // Edit camera: the orbit pivot has been moved onto the route since the camera last parked on About.
  const aboutPivoted = useRef(false);
  const configuredAboutKey = `${configuredAbout.position.join()}|${configuredAbout.lookAt.join()}`;
  useEffect(() => {
    aboutBase.current = getCameraPose('about', isMobile);
  }, [configuredAboutKey, isMobile]);
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
  // The summit the camera last snapped above (the reach field may refine it while the map holds).
  const snappedSummit = useRef('');

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
      // Edit camera on About's own pose: the composed view becomes the About pose. On arriving, the orbit's pivot
      // moves from the pose's look-at point (in the air, well in front) to the route along the line of sight, so a
      // drag turns the view about the route and the view itself does not move.
      if (controls.enabled && poseKey === 'about' && !aboutPivoted.current) {
        aboutPivoted.current = true;
        const eye = camera.position;
        const sight = controls.target.clone().sub(eye).normalize();
        const [routeX, routeZ] = ABOUT_MAP_CONFIG.focus;
        const along = ((routeX - eye.x) * sight.x + (routeZ - eye.z) * sight.z)
          / Math.max(sight.x * sight.x + sight.z * sight.z, 1e-6);
        if (along > 0) {
          controls.target.copy(eye).addScaledVector(sight, along);
          currentLookAt.current.copy(controls.target);
        }
      }
      if (controls.enabled && poseKey === 'about') {
        aboutBase.current = {
          position: camera.position.toArray() as Vector3Tuple, lookAt: controls.target.toArray() as Vector3Tuple,
        };
      }
    }

    // The intro holds the map pose until the wave has its head start; the clock reads long past when it is
    // skipped (a section route, reduced motion) and before IntroReveal has mounted, so the camera opens on the
    // overview and steps up to the map, unseen under the preloader, once the clock starts.
    const atMap = !!intro?.active && cameraFrameState.current.revealTime < intro.settings.descentDelay;
    const key = atMap ? MAP : poseKey;
    const summitKey = intro?.summitRef.current?.join() ?? '';

    const secondsFor = (kind: LegKind) => {
      switch (kind) {
        case 'descent': return intro?.settings.descentSeconds ?? CAMERA_CONFIG.transitionSeconds;
        case 'art': return artTransitionSettings.cameraSeconds;
        case 'aboutFocus': return aboutSeconds.focusSeconds;
        case 'aboutEntry': return aboutSeconds.journeySeconds;
        case 'travelFocus': return travelSeconds.focusSeconds;
        case 'travelIndex': return TRAVEL_OVERVIEW_CONFIG.indexSeconds;
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
      } else if (key === MAP) {
        const overview = getCameraPose(null, isMobile);
        const {mapHeight, phoneMapHeight, mapTilt} = intro?.settings ?? {};
        pose = mapPose(overview,
          intro?.summitRef.current ?? [CONTOUR_CONFIG.revealOriginX, overview.lookAt[1], CONTOUR_CONFIG.revealOriginZ],
          (isMobile ? phoneMapHeight : mapHeight) ?? 0, mapTilt ?? 0);
      } else if (key.startsWith('about:')) {
        pose = aboutFramingRef?.current?.(aboutBase.current, Number(key.slice('about:'.length))) ?? aboutBase.current;
      } else if (key === 'about') {
        pose = aboutBase.current;
      } else if (key === 'travel:trip') {
        pose = getTravelTripPose(isMobile);
      } else if (key === 'travel:index') {
        pose = getTravelIndexPose();
      } else {
        pose = getCameraPose(key as SectionId, isMobile);
      }
      return {position: new Vector3(...pose.position), lookAt: new Vector3(...pose.lookAt)};
    };

    // Up to the map in one step: under the preloader on arrival, or on Replay in development.
    const snapToMap = () => {
      const map = resolvePose(MAP);
      camera.position.copy(map.position);
      currentLookAt.current.copy(map.lookAt);
      camera.lookAt(currentLookAt.current);
      controls?.target.copy(currentLookAt.current);
      snappedSummit.current = summitKey;
    };

    if (key === MAP && key !== previousPoseKey.current) {
      previousPoseKey.current = MAP;
      leg.current = null;
      isAnimating.current = false;
      snapToMap();
      onPoseSettled?.(undefined);
    } else if (key === MAP && !isAnimating.current && snappedSummit.current !== summitKey) {
      snapToMap();
    } else if (key !== previousPoseKey.current) {
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
      previousPoseKey.current = key;
      leg.current = planJourney(origin, key);
      journeySeconds.current = secondsFor(leg.current.kind);
      artFogStart.current = cameraFrameState.current.artFog;
      morphStart.current = cameraFrameState.current.travelMorph;
      const destination = resolvePose(leg.current.to);
      transition.begin(camera, currentLookAt.current, destination.position, destination.lookAt);
      isAnimating.current = true;
      onPoseSettled?.(undefined);
    }

    if (isAnimating.current || !controls?.enabled) aboutPivoted.current = false;
    let descent = atMap ? 0 : 1;
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
      if (kind === 'descent') descent = MathUtils.smootherstep(progress, 0, 1);
      if (settled) {
        isAnimating.current = false;
        onPoseSettled?.(poseId);
      }
    }
    if (!isAnimating.current) {
      cameraFrameState.current.setTravelMorph(poseId === 'travel' ? 1 : 0);
      cameraFrameState.current.setTravelFocus(-1);
    }
    cameraFrameState.current.setIntroDescent(descent);
    // The map pose is no resting place: the scene text waits for the camera to land on the overview.
    cameraFrameState.current.setTransitioning(isAnimating.current || atMap);
  // Own the final pose after development OrbitControls (-1), before cache capture (-0.5).
  }, -0.75);

  return null;
}
