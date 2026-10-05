'use client';

import {useFBO} from '@react-three/drei';
import {createPortal, useFrame, useThree} from '@react-three/fiber';
import {useLayoutEffect, useMemo, useRef} from 'react';
import {
  Color, Fog, HalfFloatType, MathUtils, Matrix3, Matrix4, PerspectiveCamera, Scene, Vector2, Vector3,
  type Camera, type ShaderMaterial, type WebGLRenderer,
} from 'three';
import type {ArtMedium} from '@/data/artworks';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import type {ContourControlValues, FogControlValues, TerrainControlValues} from '@/components/debug/useSceneControls';
import {FOG_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import {ART_CURSOR_CONFIG} from '@/config/scene/artCursor';
import {ART_ILLUSTRATION_CONFIG} from '@/config/scene/artIllustration';
import {OIL_ILLUSTRATION_CONFIG} from '@/config/scene/oilIllustration';
import {PENCIL_ILLUSTRATION_CONFIG} from '@/config/scene/pencilIllustration';
import {advanceMediumTransition, settledMedium, type MediumId} from '@/lib/terrain/mediumTransition';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {artTransitionSettings} from '@/lib/scene/artTransitionSettings';
import fragmentShader from '@/shaders/terrainComposite.frag';
import {SceneFog} from './SceneFog';
import {TerrainMesh} from './TerrainMesh';
import {useArtCursor} from './useArtCursor';
import {useIllustrationTexture} from './useIllustrationTexture';
import {useCameraFrameState} from './CameraFrameState';
import {useArtScene} from '@/components/artworks/ArtSceneContext';

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const {pencil: pencilCursor, dots: dotsCursor} = ART_CURSOR_CONFIG;
// Shader constants must be written as floats.
const defines = Object.fromEntries(Object.entries({
  DIGITAL_CELL: dotsCursor.cell,
  DOTS_SHADE: dotsCursor.shade,
  DOTS_SKY: dotsCursor.sky,
  PENCIL_SPACING: pencilCursor.spacing,
  PENCIL_WIDTH: pencilCursor.width,
}).map(([name, value]) => [name, value.toFixed(4)]));

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
  artMedium?: ArtMedium | null;
  contourSettings: ContourControlValues;
  preloadIllustrations: boolean;
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
  artMedium = null,
  contourSettings,
  preloadIllustrations,
  fogSettings,
  onDepthTextureChange,
  terrainSettings,
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
  const reducedMotion = useReducedMotion();
  const cursor = useArtCursor(!!artMedium && !reducedMotion && !capture.enabled);
  const oil = useIllustrationTexture(preloadIllustrations, OIL_ILLUSTRATION_CONFIG.image, 'oil');
  const pencil = useIllustrationTexture(preloadIllustrations, PENCIL_ILLUSTRATION_CONFIG.image, 'pencil');
  const transition = useRef(settledMedium(0));
  const fogDistance = useMemo(() => new Vector2(), []);
  const fogRelease = useRef({from: 0, elapsed: -1});
  const {shellBase} = useTerrainAssets();
  const peakHeight = useMemo(() => {
    let peak = 0;
    for (const height of shellBase.data) peak = Math.max(peak, height);
    return Math.pow(peak, TERRAIN_MATERIAL_CONFIG.contrast);
  }, [shellBase]);
  const projection = useMemo(() => {
    const config = ART_ILLUSTRATION_CONFIG;
    const camera = new PerspectiveCamera(config.fov, config.aspect, .1, 100);
    camera.position.fromArray(config.position);
    camera.lookAt(new Vector3().fromArray(config.lookAt));
    const halfHeight = config.projectionDistance * Math.tan(config.fov * Math.PI / 360);
    const position = new Vector3(0, 0, -config.projectionDistance)
      .applyQuaternion(camera.quaternion).add(camera.position);
    return {camera, clip: new Matrix4(), plane: new Matrix4().compose(position,
      camera.quaternion, new Vector3(halfHeight * config.aspect, halfHeight, 1))};
  }, []);
  const uniforms = useMemo(
    () => ({
      uTexture: {value: target.texture},
      uTerrainDepth: {value: target.depthTexture},
      uClipToWorld: {value: new Matrix4()},
      uClipToView: {value: new Matrix4()},
      uRevealFog: {value: new Vector2()},
      uTerrainHeight: {value: new Vector2()},
      uResolution: {value: new Vector2()},
      uDigitalAccent: {value: new Color('#e8c77a')},
      uRevealColor: {value: new Color(contourSettings.majorColor)},
      uRevealIntensity: {value: contourSettings.majorIntensity},
      uRevealRadius: {value: contourSettings.majorRadius},
      uBackground: {value: new Color(FOG_CONFIG.color)},
      uOil: {value: target.texture},
      uPencil: {value: target.texture},
      uFrom: {value: 0},
      uTo: {value: 0},
      uProgress: {value: 1},
      uArtOpacity: {value: 0},
      uScreenToImage: {value: new Matrix3()},
      uCaptureSource: {value: -1},
      uCaptureAdjust: {value: new Vector3(0, 1, 1)},
      uCaptureReady: {value: 0},
      uTouch: {value: target.texture},
      uTouchAmount: {value: 0},
      uSmudge: {value: target.texture},
      uSmudgeAmount: {value: 0},
      uPixelRatio: {value: 1},
      uStrokeColor: {value: new Color(pencilCursor.strokeColor)},
      uPencilLines: {value: 0},
      uDotsLight: {value: 0},
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
    // Invert the authoring plane's screen projection to preserve image framing
    // across viewport sizes and the short camera departure from Art.
    projection.clip.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(projection.plane);
    const e = projection.clip.elements;
    values.uScreenToImage.value.set(e[0], e[4], e[12], e[1], e[5], e[13], e[3], e[7], e[15]).invert();
    const registered = camera.position.distanceToSquared(projection.camera.position) < .0004
      && camera.quaternion.angleTo(projection.camera.quaternion) < .002;
    values.uCaptureSource.value = capture.enabled ? capture.source : -1;
    values.uCaptureAdjust.value.set(capture.exposure, capture.contrast, capture.saturation);
    values.uCaptureReady.value = capture.enabled && artMedium
      && (capture.source !== 1 || oil) && (capture.source !== 2 || pencil) ? 1 : 0;
    if (artMedium && registered) {
      // An unloaded image leaves the currently displayed medium intact.
      const requested: MediumId = artMedium === 'digital' ? 3
        : artMedium === 'oil' && oil ? 1 : artMedium === 'pencil' && pencil ? 2 : transition.current.to;
      transition.current = advanceMediumTransition(transition.current, requested, delta,
        reducedMotion, artTransitionSettings.revealSeconds);
      values.uArtOpacity.value = 1;
      // Hold the flight fog until the arrival wipe has covered the terrain boundary.
      const {from, to} = transition.current;
      const release = fogRelease.current;
      if (reducedMotion) frameState.setArtFog(0);
      else if (from !== 0 && to !== 0) {
        if (release.elapsed < 0) Object.assign(release, {from: frameState.artFog, elapsed: 0});
        release.elapsed += step;
        const t = Math.min(release.elapsed / artTransitionSettings.fogReleaseSeconds, 1);
        frameState.setArtFog(release.from * (1 - MathUtils.smootherstep(t, 0, 1)));
      } else release.elapsed = -1;
    } else {
      fogRelease.current.elapsed = -1;
      values.uArtOpacity.value = reducedMotion ? 0
        : Math.max(0, values.uArtOpacity.value - step / ART_ILLUSTRATION_CONFIG.dissolveSeconds);
      if (values.uArtOpacity.value === 0) transition.current = settledMedium(0);
    }
    values.uFrom.value = transition.current.from;
    values.uTo.value = transition.current.to;
    values.uProgress.value = transition.current.progress;
    cursor.update({renderer: gl, delta, uniforms: values, medium: transition.current.to,
      active: !!artMedium && registered && !reducedMotion && !capture.enabled, width, height});
    if (scene.fog instanceof Fog) {
      // SceneFog blends in the Art flight fog; redraw the cache whenever it moves.
      const {near, far} = scene.fog;
      if (!values.uRevealFog.value.equals(fogDistance.set(near, far))) dirty.current = true;
      values.uRevealFog.value.copy(fogDistance);
    }
    const cameraRevision = frameState.revision;
    if (!dirty.current && renderedCameraRevision.current === cameraRevision) return;

    renderTerrain(gl, scene, camera, target);
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
          <TerrainMesh settings={terrainSettings} />
        </>,
        scene,
      )}
      <mesh frustumCulled={false} renderOrder={-1000}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={materialRef}
          depthTest={false}
          defines={defines}
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
