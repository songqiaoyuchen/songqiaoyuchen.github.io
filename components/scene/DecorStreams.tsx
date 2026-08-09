'use client';

import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AddEquation,
  Color,
  CustomBlending,
  DoubleSide,
  Mesh,
  OneFactor,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
  Vector2,
} from 'three';
import type { Mesh as MeshType } from 'three';
import {
  CAMERA_CONFIG,
  DECOR_STREAM_CONFIG,
  SCENE_LAYOUT_CONFIG,
  TERRAIN_MATERIAL_CONFIG,
  TERRAIN_MESH_CONFIG,
} from '@/config/scene';
import type {
  ContourControlValues,
  DecorStreamControlValues,
  TerrainControlValues,
} from '@/components/debug/useSceneControls';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {
  buildDecorStreamGeometry,
  DECOR_ATLAS_COLUMNS,
  generateDecorStreamLayers,
} from '@/lib/text/decorStreamGeometry';
import { DecorStreamCompositor } from '@/lib/text/decorStreamCompositor';
import {configureBitmapAtlas} from '@/lib/text/atlas';
import compositeVertexShader from '@/shaders/decorComposite.vert';
import compositeFragmentShader from '@/shaders/decorComposite.frag';
import vertexShader from '@/shaders/decorStream.vert';
import fragmentShader from '@/shaders/decorStream.frag';
import {useCameraFrameState} from './CameraFrameState';
type DecorStreamsProps = {
  contourSettings: ContourControlValues;
  decorStreamSettings: DecorStreamControlValues;
  terrainSettings: TerrainControlValues;
};

export const DecorStreams = forwardRef<MeshType, DecorStreamsProps>(function DecorStreams(
  {contourSettings, decorStreamSettings, terrainSettings},
  forwardedRef,
) {
  const compositorDirty = useRef(true);
  const animationTime = useRef(0);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const cameraFrameState = useCameraFrameState();
  const renderedCameraRevision = useRef(-1);
  const isReducedMotion = useReducedMotion();
  const atlas = useLoader(TextureLoader, '/textures/text/decorative-atlas.png');
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const {elevation, seaLevel} = terrainSettings;
  const {displacementMap, shellBase} = useTerrainAssets();
  const [fallSpeedMin, fallSpeedMax] = decorStreamSettings.fallRowsPerSecond;
  const [packetSpeedMin, packetSpeedMax] = decorStreamSettings.packetRowsPerSecond;

  const layers = useMemo(() => generateDecorStreamLayers({
    count: DECOR_STREAM_CONFIG.count,
    bounds: DECOR_STREAM_CONFIG.bounds,
    seed: DECOR_STREAM_CONFIG.seed,
    centerHeightBias: DECOR_STREAM_CONFIG.centerHeightBias,
    depthLayers: DECOR_STREAM_CONFIG.depthLayers,
    aspect: (
      SCENE_LAYOUT_CONFIG.referenceViewport.width
      / SCENE_LAYOUT_CONFIG.referenceViewport.height
    ),
    camera: {
      fov: CAMERA_CONFIG.fov,
      position: CAMERA_CONFIG.overviewPosition,
      target: CAMERA_CONFIG.overviewLookAt,
    },
    heightGrid: shellBase,
    elevation,
    seaLevel,
  }), [elevation, seaLevel, shellBase]);

  const material = useMemo(() => new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      heightmap: { value: displacementMap },
      elevation: { value: elevation },
      contrast: { value: TERRAIN_MATERIAL_CONFIG.contrast },
      seaLevel: { value: seaLevel },
      planeSize: { value: TERRAIN_MESH_CONFIG.planeSize },
      meshY: { value: TERRAIN_MESH_CONFIG.position[1] },
      uLift: { value: DECOR_STREAM_CONFIG.lift },
      uAtlas: { value: atlas },
      uAtlasColumns: { value: DECOR_ATLAS_COLUMNS },
      uColor: { value: new Color(contourSettings.minorColor) },
      uHotColor: { value: new Color(contourSettings.majorColor) },
      uEnergy: { value: DECOR_STREAM_CONFIG.energy },
      uAnimationTime: { value: 0 },
      uFallRowsPerSecond: {
        value: new Vector2(
          DECOR_STREAM_CONFIG.animation.fallRowsPerSecond[0],
          DECOR_STREAM_CONFIG.animation.fallRowsPerSecond[1],
        ),
      },
      uPacketRowsPerSecond: {
        value: new Vector2(
          DECOR_STREAM_CONFIG.animation.packetRowsPerSecond[0],
          DECOR_STREAM_CONFIG.animation.packetRowsPerSecond[1],
        ),
      },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    blendEquationAlpha: AddEquation,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneFactor,
    toneMapped: false,
  }), [
    atlas,
    contourSettings.majorColor,
    contourSettings.minorColor,
    displacementMap,
    elevation,
    seaLevel,
  ]);

  const geometries = useMemo(
    () => layers.map(buildDecorStreamGeometry),
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
    () => new DecorStreamCompositor(
      meshes,
      1,
      1,
      DECOR_STREAM_CONFIG.compositor,
    ),
    [meshes],
  );
  const compositeGeometry = useMemo(() => new PlaneGeometry(2, 2), []);
  const compositeUniforms = useMemo(
    () => ({ uTexture: { value: compositor.texture } }),
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
    compositorDirty.current = true;
  }, [fallSpeedMax, fallSpeedMin, material, packetSpeedMax, packetSpeedMin]);
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

    const cameraRevision = cameraFrameState.current.revision;
    if (
      !compositorDirty.current
      && renderedCameraRevision.current === cameraRevision
    ) return;

    compositor.render(state.gl, state.camera);
    renderedCameraRevision.current = cameraRevision;
    compositorDirty.current = false;
  });

  return (
    <>
      <mesh ref={forwardedRef} geometry={compositeGeometry} frustumCulled={false} renderOrder={3}>
        <shaderMaterial
          vertexShader={compositeVertexShader}
          fragmentShader={compositeFragmentShader}
          uniforms={compositeUniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={CustomBlending}
          blendEquation={AddEquation}
          blendSrc={OneFactor}
          blendDst={OneFactor}
          blendEquationAlpha={AddEquation}
          blendSrcAlpha={OneFactor}
          blendDstAlpha={OneFactor}
          toneMapped={false}
        />
      </mesh>
    </>
  );
});
