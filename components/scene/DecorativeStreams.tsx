'use client';

import { forwardRef, useEffect, useLayoutEffect, useMemo } from 'react';
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
} from 'three';
import type { Mesh as MeshType } from 'three';
import { EXRLoader } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { toHeightmapImage } from '@/lib/terrain/bake';
import {
  buildDecorativeStreamGeometry,
  DECORATIVE_ATLAS_COLUMNS,
  generateDecorativeStreamLayers,
} from '@/lib/text/decorativeStreamGeometry';
import { DecorativeStreamCompositor } from '@/lib/text/decorativeStreamCompositor';
import { configureBitmapAtlas, getTerrainTextMaps } from '@/lib/text/terrainTextShared';
import compositeVertexShader from '@/shaders/decorativeComposite.vert';
import compositeFragmentShader from '@/shaders/decorativeComposite.frag';
import vertexShader from '@/shaders/decorativeStream.vert';
import fragmentShader from '@/shaders/decorativeStream.frag';
import { useTerrainControls } from '../debug/useTerrainControls';

const TEXT_COUNT = 24;
const TEXT_BOUNDS = { x: [-9.5, 9.5], z: [-0.5, 9.5] } as const;
const LAYOUT_REFERENCE_WIDTH = 1440;
const LAYOUT_REFERENCE_HEIGHT = 900;

export const DecorativeStreams = forwardRef<MeshType>(function DecorativeStreams(_, forwardedRef) {
  const exr = useLoader(EXRLoader, '/textures/terrain/heightmap.exr');
  const atlas = useLoader(TextureLoader, '/textures/text/decorative-atlas.png');
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const { elevation, seaLevel } = useTerrainControls();
  const { displacementMap, shellBase } = useMemo(
    () => getTerrainTextMaps(toHeightmapImage(exr.image)),
    [exr],
  );

  const layers = useMemo(() => generateDecorativeStreamLayers({
    count: TEXT_COUNT,
    bounds: TEXT_BOUNDS,
    seed: 17,
    aspect: LAYOUT_REFERENCE_WIDTH / LAYOUT_REFERENCE_HEIGHT,
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
      contrast: { value: TERRAIN_CONFIG.material.contrast },
      seaLevel: { value: seaLevel },
      planeSize: { value: TERRAIN_CONFIG.mesh.planeSize },
      meshY: { value: TERRAIN_CONFIG.mesh.position[1] },
      uLift: { value: 0.075 },
      uAtlas: { value: atlas },
      uAtlasColumns: { value: DECORATIVE_ATLAS_COLUMNS },
      uColor: { value: new Color(TERRAIN_CONFIG.contours.minorColor) },
      uHotColor: { value: new Color(TERRAIN_CONFIG.contours.majorColor) },
      uEnergy: { value: 0.62 },
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
  }), [atlas, displacementMap, elevation, seaLevel]);

  const geometries = useMemo(
    () => layers.map(buildDecorativeStreamGeometry),
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
  // The nearest depth group skips the blur pipeline: it renders straight into
  // the main scene at native resolution so front streams stay crisp while the
  // blurred stack runs at reduced resolution.
  const nearMesh = meshes[meshes.length - 1];
  const compositor = useMemo(
    () => new DecorativeStreamCompositor(meshes.slice(0, -1), 1, 1),
    [meshes],
  );
  const compositeGeometry = useMemo(() => new PlaneGeometry(2, 2), []);
  const compositeUniforms = useMemo(
    () => ({ uTexture: { value: compositor.texture } }),
    [compositor],
  );

  useEffect(() => configureBitmapAtlas(atlas), [atlas]);
  useLayoutEffect(() => compositor.setSize(width, height), [compositor, height, width]);
  useEffect(() => () => compositor.dispose(), [compositor]);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => compositeGeometry.dispose(), [compositeGeometry]);

  useFrame((state, delta) => {
    compositor.render(state.gl, state.camera, delta);
  }, -1);

  return (
    <>
      <primitive object={nearMesh} />
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
