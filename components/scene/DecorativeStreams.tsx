'use client';

import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import {
  AddEquation,
  Color,
  CustomBlending,
  DoubleSide,
  OneFactor,
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
  generateDecorativeStreams,
} from '@/lib/text/decorativeStreamGeometry';
import { configureBitmapAtlas, getTerrainTextMaps } from '@/lib/text/terrainTextShared';
import vertexShader from '@/shaders/decorativeStream.vert';
import fragmentShader from '@/shaders/decorativeStream.frag';
import { useTerrainControls } from '../debug/useTerrainControls';

const TEXT_COUNT = 36;
const TEXT_BOUNDS = { x: [-9.5, 9.5], z: [-0.5, 9.5] } as const;

export const DecorativeStreams = forwardRef<MeshType>(function DecorativeStreams(_, forwardedRef) {
  const exr = useLoader(EXRLoader, '/textures/terrain/heightmap.exr');
  const atlas = useLoader(TextureLoader, '/textures/text/decorative-atlas.png');
  const size = useThree((state) => state.size);
  const materialRef = useRef<ShaderMaterial>(null);
  const { elevation, seaLevel } = useTerrainControls();
  const { displacementMap, shellBase } = useMemo(
    () => getTerrainTextMaps(toHeightmapImage(exr.image)),
    [exr],
  );

  const instances = useMemo(() => generateDecorativeStreams({
    count: TEXT_COUNT,
    bounds: TEXT_BOUNDS,
    seed: 17,
    aspect: size.width / Math.max(size.height, 1),
    heightGrid: shellBase,
    elevation,
    seaLevel,
  }), [elevation, seaLevel, shellBase, size.height, size.width]);

  const geometry = useMemo(
    () => buildDecorativeStreamGeometry(instances),
    [instances],
  );
  const uniforms = useMemo(() => ({
    heightmap: { value: displacementMap },
    elevation: { value: TERRAIN_CONFIG.material.elevation },
    contrast: { value: TERRAIN_CONFIG.material.contrast },
    seaLevel: { value: TERRAIN_CONFIG.material.seaLevel },
    planeSize: { value: TERRAIN_CONFIG.mesh.planeSize },
    meshY: { value: TERRAIN_CONFIG.mesh.position[1] },
    uLift: { value: 0.075 },
    uAtlas: { value: atlas },
    uAtlasColumns: { value: DECORATIVE_ATLAS_COLUMNS },
    uColor: { value: new Color(TERRAIN_CONFIG.contours.minorColor) },
    uHotColor: { value: new Color(TERRAIN_CONFIG.contours.majorColor) },
    // Direct drawing skips the old blur accumulation, which also stacked up
    // brightness; a higher energy keeps the streams at comparable presence.
    uEnergy: { value: 1.0 },
  }), [atlas, displacementMap]);

  useEffect(() => configureBitmapAtlas(atlas), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.elevation.value = elevation;
    materialRef.current.uniforms.seaLevel.value = seaLevel;
  }, [elevation, seaLevel]);

  return (
    <mesh ref={forwardedRef} geometry={geometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        side={DoubleSide}
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
  );
});
