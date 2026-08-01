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
import {useCameraFrameState} from './CameraFrameState';

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
  const cameraFrameState = useCameraFrameState();
  const renderedCameraRevision = useRef(-1);
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
    const cameraRevision = cameraFrameState.current.revision;
    if (!dirty.current && renderedCameraRevision.current === cameraRevision) return;

    renderTerrain(gl, scene, camera, target);
    renderedCameraRevision.current = cameraRevision;
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
