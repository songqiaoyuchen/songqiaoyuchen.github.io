// Glyph rain: faint falling letter columns behind the scene links, depth-blurred offscreen then added on top.
'use client';

import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
  Vector2,
} from 'three';
import type {Group, Mesh as MeshType} from 'three';
import type {
  ContourControlValues,
  GlyphRainControlValues,
  TerrainControlValues,
} from '@/components/scene/controls/useSceneControls';
import {
  CAMERA_CONFIG,
  GLYPH_RAIN_CONFIG,
  getCameraPose,
  SCENE_LAYOUT_CONFIG,
  SCENE_LINK_EFFECT_CONFIG,
} from '@/config/scene';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {markFrameChanged} from '@/lib/scene/stillFrames';
import {advanceTextVisibility} from '@/lib/scene/textTransition';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {configureBitmapAtlas} from '@/lib/text/atlas';
import { GlyphRainCompositor } from '@/lib/text/glyphRainCompositor';
import {
  buildGlyphRainGeometry,
  generateGlyphRainLayers,
} from '@/lib/text/glyphRainGeometry';
import compositeFragmentShader from '@/shaders/text/glyphRainComposite.frag';
import compositeVertexShader from '@/shaders/text/glyphRainComposite.vert';
import {useCameraFrameState} from '../camera/CameraFrameState';
import {ADDITIVE_BLEND, createGlyphRainMaterial} from './glyphRainMaterial';

type GlyphRainProps = {
  hidden?: boolean;
  contourSettings: ContourControlValues;
  glyphRainSettings: GlyphRainControlValues;
  terrainSettings: TerrainControlValues;
};

export const GlyphRain = forwardRef<MeshType, GlyphRainProps>(function GlyphRain(
  {hidden = false, contourSettings, glyphRainSettings, terrainSettings},
  forwardedRef,
) {
  const compositorDirty = useRef(true);
  const animationTime = useRef(0);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const compositeMaterialRef = useRef<ShaderMaterial | null>(null);
  const layerRef = useRef<Group>(null);
  const cameraFrameState = useCameraFrameState();
  const renderedCameraRevision = useRef(-1);
  const isReducedMotion = useReducedMotion();
  const atlas = useLoader(TextureLoader, '/textures/text/decorative-atlas.png');
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const {elevation, seaLevel} = terrainSettings;
  const {displacementMap, shellBase} = useTerrainAssets();
  const [fallSpeedMin, fallSpeedMax] = glyphRainSettings.fallRowsPerSecond;
  const [packetSpeedMin, packetSpeedMax] = glyphRainSettings.packetRowsPerSecond;
  const [swapSpeedMin, swapSpeedMax] = glyphRainSettings.letterSwapsPerSecond;
  const isMobile = width < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const overviewPose = getCameraPose(
    null,
    isMobile,
  );
  const layoutAspect = isMobile
    ? width / Math.max(height, 1)
    : (
      SCENE_LAYOUT_CONFIG.referenceViewport.width
      / SCENE_LAYOUT_CONFIG.referenceViewport.height
    );

  const layers = useMemo(() => generateGlyphRainLayers({
    count: isMobile
      ? GLYPH_RAIN_CONFIG.mobileCount
      : GLYPH_RAIN_CONFIG.count,
    bounds: GLYPH_RAIN_CONFIG.bounds,
    seed: GLYPH_RAIN_CONFIG.seed,
    centerHeightBias: GLYPH_RAIN_CONFIG.centerHeightBias,
    depthLayers: GLYPH_RAIN_CONFIG.depthLayers,
    aspect: layoutAspect,
    camera: {
      fov: CAMERA_CONFIG.fov,
      position: overviewPose.position,
      target: overviewPose.lookAt,
    },
    heightGrid: shellBase,
    elevation,
    seaLevel,
  }), [elevation, isMobile, layoutAspect, overviewPose, seaLevel, shellBase]);

  const material = useMemo(() => createGlyphRainMaterial({
    atlas,
    heightmap: displacementMap,
    elevation,
    seaLevel,
    color: contourSettings.minorColor,
    hotColor: contourSettings.majorColor,
  }), [
    atlas,
    contourSettings.majorColor,
    contourSettings.minorColor,
    displacementMap,
    elevation,
    seaLevel,
  ]);

  const geometries = useMemo(
    () => layers.map(buildGlyphRainGeometry),
    [layers],
  );
  const meshes = useMemo(
    () => geometries.map((geometry) => {
      const mesh = new Mesh(geometry, material);
      // Instance anchors are applied in the vertex shader, so Three.js cannot
      // derive their real world-space bounds from the base plane geometry.
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      return mesh;
    }),
    [geometries, material],
  );
  const compositor = useMemo(
    () => new GlyphRainCompositor(
      meshes,
      1,
      1,
      GLYPH_RAIN_CONFIG.compositor,
    ),
    [meshes],
  );
  const compositeGeometry = useMemo(() => new PlaneGeometry(2, 2), []);
  const compositeUniforms = useMemo(
    () => ({ uTexture: { value: compositor.texture }, uVisibility: {value: 0} }),
    [compositor],
  );

  useEffect(() => {
    materialRef.current = material;
    return () => {
      if (materialRef.current === material) materialRef.current = null;
    };
  }, [material]);
  useEffect(() => {
    (material.uniforms.uFallRowsPerSecond.value as Vector2).set(
      fallSpeedMin,
      fallSpeedMax,
    );
    (material.uniforms.uPacketRowsPerSecond.value as Vector2).set(
      packetSpeedMin,
      packetSpeedMax,
    );
    (material.uniforms.uLetterSwapsPerSecond.value as Vector2).set(
      swapSpeedMin,
      swapSpeedMax,
    );
    compositorDirty.current = true;
  }, [
    fallSpeedMax,
    fallSpeedMin,
    material,
    packetSpeedMax,
    packetSpeedMin,
    swapSpeedMax,
    swapSpeedMin,
  ]);
  useEffect(() => {
    configureBitmapAtlas(atlas);
    compositorDirty.current = true;
  }, [atlas]);
  useEffect(() => {
    animationTime.current = 0;
    const currentMaterial = materialRef.current;
    if (currentMaterial) currentMaterial.uniforms.uAnimationTime.value = 0;
    compositorDirty.current = true;
  }, [isReducedMotion]);
  useLayoutEffect(() => {
    compositor.setSize(width, height);
    compositorDirty.current = true;
  }, [compositor, height, width]);
  useEffect(() => () => compositor.dispose(), [compositor]);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => compositeGeometry.dispose(), [compositeGeometry]);

  useFrame((state, delta) => {
    const visibility = compositeMaterialRef.current?.uniforms.uVisibility;
    const visible = !hidden && !cameraFrameState.current.transitioning;
    if (visibility) {
      visibility.value = advanceTextVisibility(visibility.value, visible, delta, isReducedMotion,
        SCENE_LINK_EFFECT_CONFIG.dissolveInSpeed, SCENE_LINK_EFFECT_CONFIG.dissolveOutSpeed);
      if (layerRef.current) layerRef.current.visible = visibility.value > 0;
    }
    if (!isReducedMotion) {
      // Lusion advances the ray shader continuously. Clamping only protects a
      // resumed background tab from a visible catch-up jump.
      animationTime.current += Math.min(delta, 1 / 15);
      const currentMaterial = materialRef.current;
      if (currentMaterial) {
        currentMaterial.uniforms.uAnimationTime.value = animationTime.current;
      }
      compositorDirty.current = true;
    }
    // Fully faded out (Art, camera journeys): skip the offscreen passes; they redraw on return.
    if (layerRef.current?.visible === false) return;

    const cameraRevision = cameraFrameState.current.revision;
    if (
      !compositorDirty.current
      && renderedCameraRevision.current === cameraRevision
    ) return;

    compositor.render(state.gl, state.camera);
    markFrameChanged();
    renderedCameraRevision.current = cameraRevision;
    compositorDirty.current = false;
  });

  return (
    <group ref={layerRef}>
      <mesh ref={forwardedRef} geometry={compositeGeometry} frustumCulled={false} renderOrder={3}>
        <shaderMaterial
          ref={compositeMaterialRef}
          vertexShader={compositeVertexShader}
          fragmentShader={compositeFragmentShader}
          uniforms={compositeUniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          {...ADDITIVE_BLEND}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
});
