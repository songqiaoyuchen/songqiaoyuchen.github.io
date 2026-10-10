// Terrain cache + compositor: renders the terrain offscreen only when needed, then composites it with
// the Art backdrops (oil, pencil, digital), the backdrop wipe, fog and the Art cursor in one full-screen pass.
'use client';

import {useFBO} from '@react-three/drei';
import {createPortal, useFrame, useThree} from '@react-three/fiber';
import {useLayoutEffect, useMemo, useRef} from 'react';
import {
  Fog, HalfFloatType, Scene, Vector2,
  type Camera, type ShaderMaterial, type WebGLRenderer,
} from 'three';
import {useArtScene} from '@/components/art/ArtSceneContext';
import type {
  ContourControlValues, FogControlValues, TerrainControlValues,
} from '@/components/scene/controls/useSceneControls';
import {BACKDROP_CONFIG} from '@/config/art/backdrop';
import {FOG_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {ArtMedium} from '@/data/artworks';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {advanceBackdropWipe, settledBackdrop} from '@/lib/art/backdropWipe';
import {artTransitionSettings} from '@/lib/art/transitionSettings';
import {markFrameChanged} from '@/lib/scene/stillFrames';
import {useTerrainAssets} from '@/lib/terrain/assets';
import fragmentShader from '@/shaders/terrain/terrainComposite.frag';
import {releaseFlightFog, requestedBackdrop, type FogRelease} from '../backdrop/backdropFrame';
import {createBackdropProjection, isRegistered, updateScreenToImage} from '../backdrop/backdropProjection';
import {useArtCursor} from '../backdrop/useArtCursor';
import {useBackdropImage} from '../backdrop/useBackdropImage';
import {useCameraFrameState} from '../camera/CameraFrameState';
import {compositeDefines, compositeVertexShader, createCompositeUniforms} from './compositeMaterial';
import {SceneFog} from './SceneFog';
import {TerrainMesh} from './TerrainMesh';

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
  backdrop?: ArtMedium | null;
  contourSettings: ContourControlValues;
  preloadBackdrops: boolean;
  fogSettings: FogControlValues;
  onDepthTextureChange: (texture: ReturnType<typeof useFBO>['depthTexture']) => void;
  terrainSettings: TerrainControlValues;
  /** The globe's colours, for the terrain riding to Travel. */
  travelLook: {baseColor: string; lineColor: string; landTint: number; shade: number};
};

/**
 * Renders the static terrain into a full-resolution texture only when its
 * camera, viewport, fog, or material controls change. The animated contour and
 * text layers continue rendering normally over the cached result. Its cached
 * depth texture is exposed so contours can reject only their hidden fragments.
 */
export function CachedTerrain({
  backdrop = null,
  contourSettings,
  preloadBackdrops,
  fogSettings,
  onDepthTextureChange,
  terrainSettings,
  travelLook,
}: CachedTerrainProps) {
  const scene = useMemo(() => new Scene(), []);
  const {capture} = useArtScene();
  const materialRef = useRef<ShaderMaterial>(null);
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
  const renderedMorph = useRef(-1);
  const reducedMotion = useReducedMotion();
  const cursor = useArtCursor(!!backdrop && !reducedMotion && !capture.enabled);
  const oil = useBackdropImage(preloadBackdrops, BACKDROP_CONFIG.images.oil, 'oil');
  const pencil = useBackdropImage(preloadBackdrops, BACKDROP_CONFIG.images.pencil, 'pencil');
  const wipe = useRef(settledBackdrop(0));
  const fogDistance = useMemo(() => new Vector2(), []);
  const fogRelease = useRef<FogRelease>({from: 0, elapsed: -1});
  const {shellBase} = useTerrainAssets();
  const peakHeight = useMemo(() => {
    let peak = 0;
    for (const height of shellBase.data) peak = Math.max(peak, height);
    return Math.pow(peak, TERRAIN_MATERIAL_CONFIG.contrast);
  }, [shellBase]);
  const projection = useMemo(() => createBackdropProjection(), []);
  const uniforms = useMemo(
    () => createCompositeUniforms(target.texture, target.depthTexture, {
      majorColor: contourSettings.majorColor,
      majorIntensity: contourSettings.majorIntensity,
      majorRadius: contourSettings.majorRadius,
    }),
    [contourSettings.majorColor, contourSettings.majorIntensity, contourSettings.majorRadius,
      target.depthTexture, target.texture],
  );

  useLayoutEffect(() => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
    if (accent) uniforms.uDigitalAccent.value.set(accent);
  }, [uniforms]);

  useLayoutEffect(() => {
    onDepthTextureChange(target.depthTexture);
    return () => onDepthTextureChange(null);
  }, [onDepthTextureChange, target.depthTexture]);

  useLayoutEffect(() => {
    dirty.current = true;
  }, [dpr, fogSettings, height, target, terrainSettings, width]);

  useFrame(({camera, gl}, delta) => {
    const values = materialRef.current?.uniforms;
    if (!values) return;
    const step = Math.min(delta, .05);
    const frameState = cameraFrameState.current;
    values.uOil.value = oil ?? target.texture;
    values.uPencil.value = pencil ?? target.texture;
    values.uResolution.value.set(width, height);
    values.uPixelRatio.value = dpr;
    updateScreenToImage(projection, camera, values.uScreenToImage.value);
    const registered = isRegistered(projection, camera);
    values.uCaptureSource.value = capture.enabled ? capture.source : -1;
    values.uCaptureAdjust.value.set(capture.exposure, capture.contrast, capture.saturation);
    values.uCaptureReady.value = capture.enabled && backdrop
      && (capture.source !== 1 || oil) && (capture.source !== 2 || pencil) ? 1 : 0;
    if (backdrop && registered) {
      wipe.current = advanceBackdropWipe(wipe.current, requestedBackdrop(backdrop, oil, pencil, wipe.current.to),
        delta, reducedMotion, artTransitionSettings.revealSeconds);
      values.uArtOpacity.value = 1;
      if (reducedMotion) frameState.setArtFog(0);
      else {
        const fog = releaseFlightFog(fogRelease.current, wipe.current, frameState.artFog, step,
          artTransitionSettings.fogReleaseSeconds);
        if (fog !== null) frameState.setArtFog(fog);
      }
    } else {
      fogRelease.current.elapsed = -1;
      values.uArtOpacity.value = reducedMotion ? 0
        : Math.max(0, values.uArtOpacity.value - step / BACKDROP_CONFIG.dissolveSeconds);
      if (values.uArtOpacity.value === 0) wipe.current = settledBackdrop(0);
    }
    values.uFrom.value = wipe.current.from;
    values.uTo.value = wipe.current.to;
    values.uProgress.value = wipe.current.progress;
    cursor.update({renderer: gl, delta, uniforms: values, backdrop: wipe.current.to,
      active: !!backdrop && registered && !reducedMotion && !capture.enabled, width, height});
    // Cursor trails redraw their textures every frame while they exist.
    if (values.uSmudgeAmount.value || values.uTouchAmount.value) markFrameChanged();
    if (scene.fog instanceof Fog) {
      // SceneFog blends in the Art flight fog; redraw the cache whenever it moves.
      const {near, far} = scene.fog;
      if (!values.uRevealFog.value.equals(fogDistance.set(near, far))) dirty.current = true;
      values.uRevealFog.value.copy(fogDistance);
    }
    // The Travel morph reshapes the terrain every frame it runs, and the patch turns with the globe.
    const {travelMorph} = frameState;
    if (travelMorph !== renderedMorph.current || (travelMorph > 0 && travelMorph < 1)) dirty.current = true;
    renderedMorph.current = travelMorph;
    const cameraRevision = frameState.revision;
    if (!dirty.current && renderedCameraRevision.current === cameraRevision) return;

    renderTerrain(gl, scene, camera, target);
    markFrameChanged();
    // Keep reconstruction paired with the camera that produced the cached depth.
    values.uClipToWorld.value.copy(camera.matrixWorld).multiply(camera.projectionMatrixInverse);
    values.uClipToView.value.copy(camera.projectionMatrixInverse);
    const peak = Math.min(1, Math.max(0,
      (peakHeight - terrainSettings.seaLevel) / Math.max(1 - terrainSettings.seaLevel, .0001)));
    values.uTerrainHeight.value.set(TERRAIN_MESH_CONFIG.position[1],
      Math.max(peak * terrainSettings.elevation, .0001));
    renderedCameraRevision.current = cameraRevision;
    dirty.current = false;
  }, 0.5);

  return (
    <>
      {createPortal(
        <>
          <color attach="background" args={[FOG_CONFIG.color]} />
          <SceneFog settings={fogSettings} />
          <TerrainMesh look={travelLook} settings={terrainSettings} />
        </>,
        scene,
      )}
      <mesh frustumCulled={false} renderOrder={-1000}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={materialRef}
          depthTest={false}
          defines={compositeDefines}
          depthWrite={false}
          fragmentShader={fragmentShader}
          toneMapped={false}
          uniforms={uniforms}
          vertexShader={compositeVertexShader}
        />
      </mesh>
    </>
  );
}
