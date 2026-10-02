'use client';

import {
  createContext,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import {useFrame} from '@react-three/fiber';
import type {Camera} from 'three';

const CAMERA_MATRIX_VALUE_COUNT = 32;
const CAMERA_FRAME_PRIORITY = -0.5;

type CameraFrameState = {
  revision: number;
  transitioning: boolean;
  setTransitioning: (transitioning: boolean) => void;
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
    setTransitioning: (transitioning) => { frameState.current.transitioning = transitioning; },
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
