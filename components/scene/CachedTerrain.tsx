'use client';

import {useFBO} from '@react-three/drei';
import {createPortal, useFrame, useThree} from '@react-three/fiber';
import {useLayoutEffect, useMemo, useRef} from 'react';
import {HalfFloatType, Scene, type Camera, type WebGLRenderer} from 'three';
import type {
  FogControlValues,
  TerrainControlValues,
} from '@/components/debug/useSceneControls';
import {FOG_CONFIG} from '@/config/scene';
import {SceneFog} from './SceneFog';
import {TerrainMesh} from './TerrainMesh';

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;

const MATRIX_VALUE_COUNT = 32;

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

function renderTerrain(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  target: ReturnType<typeof useFBO>,
) {
  const previousTarget = renderer.getRenderTarget();
  const previousAutoClear = renderer.autoClear;

  renderer.autoClear = true;
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(previousTarget);
  renderer.autoClear = previousAutoClear;
}

type CachedTerrainProps = {
  fogSettings: FogControlValues;
  onDepthTextureChange: (texture: ReturnType<typeof useFBO>['depthTexture']) => void;
  terrainSettings: TerrainControlValues;
};

/**
 * Renders the static terrain into a full-resolution texture only when its
 * camera, viewport, fog, or material controls change. The animated contour and
 * stream layers continue rendering normally over the cached result. Its cached
 * depth texture is exposed so contours can reject only their hidden fragments.
 */
export function CachedTerrain({
  fogSettings,
  onDepthTextureChange,
  terrainSettings,
}: CachedTerrainProps) {
  const scene = useMemo(() => new Scene(), []);
  const target = useFBO({
    depthBuffer: true,
    stencilBuffer: false,
    samples: 0,
    type: HalfFloatType,
  });
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const dpr = useThree((state) => state.viewport.dpr);
  const dirty = useRef(true);
  const previousCamera = useRef(new Float64Array(MATRIX_VALUE_COUNT).fill(Number.NaN));
  const uniforms = useMemo(
    () => ({uTexture: {value: target.texture}}),
    [target.texture],
  );

  useLayoutEffect(() => {
    onDepthTextureChange(target.depthTexture);
    return () => onDepthTextureChange(null);
  }, [onDepthTextureChange, target.depthTexture]);

  useLayoutEffect(() => {
    dirty.current = true;
  }, [dpr, fogSettings, height, target, terrainSettings, width]);

  useFrame(({camera, gl}) => {
    camera.updateMatrixWorld();
    if (!dirty.current && !cameraChanged(camera, previousCamera.current)) return;

    renderTerrain(gl, scene, camera, target);
    rememberCamera(camera, previousCamera.current);
    dirty.current = false;
  }, 0.5);

  return (
    <>
      {createPortal(
        <>
          <color attach="background" args={[FOG_CONFIG.color]} />
          <SceneFog settings={fogSettings} />
          <TerrainMesh settings={terrainSettings} />
        </>,
        scene,
      )}
      <mesh frustumCulled={false} renderOrder={-1000}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          depthTest={false}
          depthWrite={false}
          fragmentShader={fragmentShader}
          toneMapped={false}
          uniforms={uniforms}
          vertexShader={vertexShader}
        />
      </mesh>
    </>
  );
}
