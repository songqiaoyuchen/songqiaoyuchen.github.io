// Moves the camera between section poses (overview, projects, art, blog, about, places) and drives Art flight fog. A
// journey is one motion straight from pose to pose (lib/scene/cameraJourney.ts), its effects running over the whole of
// it. On About, an entry being read gets its own framing of that checkpoint (AboutPath publishes the poses); on Places,
// all locations and a selected location are two poses, the location's its quarter-sphere framing (phones add a third,
// all locations stepped back while the location list is pulled up). The first frame lands on the view the route opens
// (a refresh on a location stays on the location). The homepage intro moves the camera nowhere: it opens on the
// overview under the preloader, and the scene text waits (holdSceneText) until the preloader's ink has lifted.
'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {MathUtils, PerspectiveCamera, Vector3, type Vector3Tuple} from 'three';
import type { OrbitControls as OrbitControlsInstance } from 'three-stdlib';
import {
  CAMERA_CONFIG,
  CAMERA_JOURNEY_CONFIG,
  getCameraPose,
  getPlacesIndexPose,
  getPlacesLocationPose,
  SCENE_LAYOUT_CONFIG,
  type CameraPose,
} from '@/config/scene';
import {ABOUT_MAP_CONFIG} from '@/config/scene/aboutPath';
import type {SectionId} from '@/data/sections';
import {usePlacesScene} from '@/components/places/PlacesSceneContext';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {artTransitionSettings} from '@/lib/art/transitionSettings';
import {getHomeFov} from '@/lib/scene/camera';
import type {AboutFraming} from '@/lib/scene/aboutPath';
import {HOME, isPlacesKey, planJourney, type JourneyLeg, type LegKind} from '@/lib/scene/cameraJourney';
import {CameraTransition} from '@/lib/scene/cameraTransition';
import {useCameraFrameState} from './CameraFrameState';

type CameraRigProps = {
  activeId: SectionId | null;
  /** About checkpoint to frame, or -1 for the About pose itself. */
  aboutStop?: number;
  /** Frames an About checkpoint from an About pose (AboutPath publishes it). */
  aboutFramingRef?: MutableRefObject<AboutFraming | null>;
  /** Journey times per kind (Leva Camera Journeys; CAMERA_JOURNEY_CONFIG). Art's is read live from
   * artTransitionSettings, which Leva Art Transition retunes. */
  journeySeconds?: Readonly<Record<Exclude<LegKind, 'art'>, number>>;
  /** The homepage intro is under way (the preloader's ink over the scene): the scene text waits as it does for a
   * journey, so the name and the scene links enter once the landscape is uncovered. */
  holdSceneText?: boolean;
  onPoseSettled?: (pose: SectionId | null | undefined) => void;
  controlsRef?: React.RefObject<OrbitControlsInstance | null>;
};

// About's checkpoint framings (`about:<stop>`) are About's own pose: a journey between them never unsettles it.
const sectionPose = (key: string) => key.replace(/^about:\d+$/, 'about');
const isSamePose = (from: string, to: string) => sectionPose(from) === sectionPose(to);

export function CameraRig({
  activeId, aboutStop = -1, aboutFramingRef, journeySeconds: journeyTimes = CAMERA_JOURNEY_CONFIG,
  holdSceneText = false, controlsRef, onPoseSettled,
}: CameraRigProps) {
  const cameraFrameState = useCameraFrameState();
  const {selectedId: placesSelectedId, indexOpen: placesIndexOpen} = usePlacesScene();
  const placesSelected = placesSelectedId !== null;
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
  // Phones keep the overview camera for Blog and Projects; Art, About and Places have their own phone poses.
  const poseId = activeId && (!isMobile || activeId === 'art' || activeId === 'about' || activeId === 'places')
    ? activeId
    : null;
  const focusStop = poseId === 'about' ? aboutStop : -1;
  const poseKey = focusStop >= 0
    ? `about:${focusStop}`
    : poseId === 'places' && placesSelected
      ? 'places:location'
      : poseId === 'places' && isMobile && placesIndexOpen
        ? 'places:index'
        : poseId ?? (isMobile ? 'mobile-overview' : 'overview');
  const configuredPose = poseKey === 'places:location'
    ? getPlacesLocationPose(isMobile)
    : poseKey === 'places:index' ? getPlacesIndexPose() : getCameraPose(poseId, isMobile);
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
  // A new destination unsettles the camera from this render on, before the journey's first frame, so what waits for
  // it to settle (SceneShell's drawer and section content) never shows for the frame in between. Framing About's
  // checkpoints as the drawer scrolls stays within About, so the drawer it follows stays open.
  const announcedPoseKey = useRef(poseKey);
  useLayoutEffect(() => {
    if (poseKey === announcedPoseKey.current) return;
    const leavesPose = !isSamePose(announcedPoseKey.current, poseKey);
    announcedPoseKey.current = poseKey;
    if (leavesPose) onPoseSettled?.(undefined);
  }, [onPoseSettled, poseKey]);
  const isAnimating = useRef(false);
  // The journey under way (one motion from pose to pose) and its time.
  const leg = useRef<JourneyLeg | null>(null);
  const journeySeconds = useRef<number>(CAMERA_JOURNEY_CONFIG.default);
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

    const key = poseKey;

    const secondsFor = (kind: LegKind) => kind === 'art' ? artTransitionSettings.cameraSeconds : journeyTimes[kind];

    // The pose a key stands for; a destination's own framing where it has one.
    const resolvePose = (key: string): {position: Vector3; lookAt: Vector3} => {
      let pose: CameraPose;
      if (key === HOME) {
        // The overview is wherever the visitor left it (bookkept below).
        return {position: overviewReturnPosition.current, lookAt: overviewReturnLookAt.current};
      } else if (key.startsWith('about:')) {
        pose = aboutFramingRef?.current?.(aboutBase.current, Number(key.slice('about:'.length))) ?? aboutBase.current;
      } else if (key === 'about') {
        pose = aboutBase.current;
      } else if (key === 'places:location') {
        pose = getPlacesLocationPose(isMobile);
      } else if (key === 'places:index') {
        pose = getPlacesIndexPose();
      } else {
        pose = getCameraPose(key as SectionId, isMobile);
      }
      return {position: new Vector3(...pose.position), lookAt: new Vector3(...pose.lookAt)};
    };

    if (key !== previousPoseKey.current) {
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
      const leavesPose = !isSamePose(previousPoseKey.current, key);
      previousPoseKey.current = key;
      leg.current = planJourney(origin, key);
      journeySeconds.current = secondsFor(leg.current.kind);
      artFogStart.current = cameraFrameState.current.artFog;
      morphStart.current = cameraFrameState.current.placesMorph;
      const destination = resolvePose(leg.current.to);
      transition.begin(camera, currentLookAt.current, destination.position, destination.lookAt);
      isAnimating.current = true;
      if (leavesPose) onPoseSettled?.(undefined);
    }

    if (isAnimating.current || !controls?.enabled) aboutPivoted.current = false;
    if (isAnimating.current && leg.current) {
      const settled = transition.advance(
        camera, currentLookAt.current, delta, journeySeconds.current, isReducedMotion,
      );
      controls?.target.copy(currentLookAt.current);
      // The effects go by the journey's two ends and run over its whole length (a journey from Art to Places
      // releases the fog and morphs the terrain at once); the last frame lands exactly on their end values. Every
      // journey carries them to its destination's resting values, so one that cuts a journey short mid-way (a
      // location opened while the globe is still forming, a return to Places from part-way out of it) finishes
      // what the last one left rather than freezing it until it snaps on arrival.
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
      } else if (artFogStart.current > 0) {
        // A flight out of Art cut short away from it: the fog it left thins over this journey.
        cameraFrameState.current.setArtFog(
          MathUtils.lerp(artFogStart.current, 0, MathUtils.smootherstep(progress, 0, 1)));
      }
      // Into Places the terrain shrinks onto the globe over the journey, from wherever the camera set off; out
      // of it, it grows back, from the overview's or a location's framing alike. Between Places's own poses the
      // morph holds at 1, or finishes a zoom-out cut short.
      cameraFrameState.current.setPlacesMorph(
        MathUtils.lerp(morphStart.current, isPlacesKey(to) ? 1 : 0, MathUtils.smootherstep(progress, 0, 1)));
      // Between Places's overview and a location the globe turns the location into frame on the camera's clock.
      cameraFrameState.current.setPlacesFocus(kind === 'placesFocus' ? progress : -1);
      if (settled) {
        isAnimating.current = false;
        onPoseSettled?.(poseId);
      }
    }
    if (!isAnimating.current) {
      cameraFrameState.current.setPlacesMorph(poseId === 'places' ? 1 : 0);
      cameraFrameState.current.setPlacesFocus(-1);
    }
    // Under the intro's ink the scene text waits as it would for a journey.
    cameraFrameState.current.setTransitioning(isAnimating.current || holdSceneText);
  // Own the final pose after development OrbitControls (-1), before cache capture (-0.5).
  }, -0.75);

  return null;
}
