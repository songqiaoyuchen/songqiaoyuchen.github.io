// Per-frame camera bookkeeping shared by scene layers: change revision, journey flag and Art flight-fog weight.
'use client';

import {
  createContext,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import {useFrame} from '@react-three/fiber';
import {Vector3, type Camera} from 'three';
import {REVEAL_DONE_SECONDS} from '@/lib/scene/introReveal';

const CAMERA_MATRIX_VALUE_COUNT = 32;
const CAMERA_FRAME_PRIORITY = -0.5;

type CameraFrameState = {
  revision: number;
  transitioning: boolean;
  // Flight fog weight: raised by Art camera journeys, released by the arrival wipe.
  artFog: number;
  // Travel morph: 0 shows the terrain in place, 1 has it shrunk onto the globe; driven by Travel journeys.
  travelMorph: number;
  // A journey between Travel's overview and a trip: the camera's progress by time, 0 to 1, or -1 with none under way.
  travelFocus: number;
  // Where the terrain rides on the planet (set by TravelGlobe every frame while the morph runs): the planet's
  // current centre and radius, the unit direction from its centre to the patch with the patch's east and north axes
  // there, the terrain point (plane level, world space) that lands on that anchor, world units of arc per landscape
  // unit (scale), the terrain's height factor there (relief), the planet's own relief as a share of its radius
  // (lift), and the datum: the landing place's height above sea in landscape units (seaUnits), the terrain
  // surface's world y at the pivot (datumY) and metres per landscape unit (metresPerUnit).
  travelPatch: {
    anchor: Vector3; east: Vector3; north: Vector3; center: Vector3; pivot: Vector3;
    radius: number; scale: number; relief: number; lift: number;
    seaUnits: number; datumY: number; metresPerUnit: number;
  };
  // The homepage intro reveal's clock (written by IntroReveal every frame): seconds into the intro. Skipped, it
  // is REVEAL_DONE_SECONDS: the wave counts as long past everything.
  revealTime: number;
  // The intro's descent (written by CameraRig every frame): 0 with the camera at the map pose above the summit,
  // rising to 1 as it lands on the overview; 1 whenever there is no intro. The ground's light and the fog follow it.
  introDescent: number;
  setArtFog: (weight: number) => void;
  setTravelMorph: (morph: number) => void;
  setTravelFocus: (progress: number) => void;
  setTravelPatchMetrics: (metrics: {
    radius: number; scale: number; relief: number; lift: number; seaUnits: number; datumY: number;
    metresPerUnit: number;
  }) => void;
  setTransitioning: (transitioning: boolean) => void;
  setRevealTime: (time: number) => void;
  setIntroDescent: (descent: number) => void;
};

const CameraFrameContext = createContext<MutableRefObject<CameraFrameState> | null>(null);

function cameraChanged(camera: Camera, previous: Float64Array) {
  const world = camera.matrixWorld.elements;
  const projection = camera.projectionMatrix.elements;

  for (let index = 0; index < 16; index++) {
    if (
      previous[index] !== world[index]
      || previous[index + 16] !== projection[index]
    ) {
      return true;
    }
  }
  return false;
}

function rememberCamera(camera: Camera, target: Float64Array) {
  const world = camera.matrixWorld.elements;
  const projection = camera.projectionMatrix.elements;

  for (let index = 0; index < 16; index++) {
    target[index] = world[index];
    target[index + 16] = projection[index];
  }
}

export function CameraFrameProvider({children}: {children: ReactNode}) {
  const frameState = useRef<CameraFrameState>({
    revision: 0,
    transitioning: false,
    artFog: 0,
    travelMorph: 0,
    travelFocus: -1,
    travelPatch: {
      anchor: new Vector3(0, 1, 0), east: new Vector3(-1, 0, 0), north: new Vector3(0, 0, 1),
      center: new Vector3(), pivot: new Vector3(), radius: 1, scale: 1, relief: 1, lift: 0,
      seaUnits: 0, datumY: 0, metresPerUnit: 1000,
    },
    revealTime: REVEAL_DONE_SECONDS,
    introDescent: 1,
    setArtFog: (weight) => { frameState.current.artFog = weight; },
    setTravelMorph: (morph) => { frameState.current.travelMorph = morph; },
    setTravelFocus: (progress) => { frameState.current.travelFocus = progress; },
    setTravelPatchMetrics: (metrics) => {
      Object.assign(frameState.current.travelPatch, metrics);
    },
    setTransitioning: (transitioning) => { frameState.current.transitioning = transitioning; },
    setRevealTime: (time) => { frameState.current.revealTime = time; },
    setIntroDescent: (descent) => { frameState.current.introDescent = descent; },
  });
  const previousCamera = useRef(
    new Float64Array(CAMERA_MATRIX_VALUE_COUNT).fill(Number.NaN),
  );

  useFrame(({camera}) => {
    camera.updateMatrixWorld();
    if (!cameraChanged(camera, previousCamera.current)) return;

    rememberCamera(camera, previousCamera.current);
    frameState.current.revision += 1;
  }, CAMERA_FRAME_PRIORITY);

  return (
    <CameraFrameContext.Provider value={frameState}>
      {children}
    </CameraFrameContext.Provider>
  );
}

export function useCameraFrameState() {
  const frameState = useContext(CameraFrameContext);
  if (!frameState) {
    throw new Error('useCameraFrameState must be used inside CameraFrameProvider.');
  }
  return frameState;
}
