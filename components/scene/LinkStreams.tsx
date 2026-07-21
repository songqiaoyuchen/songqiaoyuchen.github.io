'use client';

import { Html } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  TextureLoader,
  Vector4,
} from 'three';
import type { Mesh } from 'three';
import { EXRLoader } from 'three-stdlib';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { toHeightmapImage } from '@/lib/terrain/bake';
import {
  buildLinkStreamGeometry,
  linkStreamWorldHeight,
  type LinkStreamRun,
} from '@/lib/text/linkStreamGeometry';
import {
  configureSdfAtlas,
  getTerrainTextMaps,
  sampleTerrainHeight,
} from '@/lib/text/terrainTextShared';
import vertexShader from '@/shaders/linkStream.vert';
import fragmentShader from '@/shaders/linkStream.frag';
import { useTerrainControls } from '../debug/useTerrainControls';

type LinkStream = LinkStreamRun & {
  id: string;
};

type Props = {
  onMaterialReady?: (material: ShaderMaterial | null) => void;
};

const LINK_STREAMS: LinkStream[] = [
  { id: 'projects', text: 'PROJECTS',
    navRange: [0, 8], anchor: [7.05, 4.05],
    size: 0.45, spacing: 0.08, bottomOffset: 0.6, 
    linkId: 0, intensity: 1.18, seed: 2.1 },
  { id: 'art', text: 'ART',
    navRange: [0, 3], anchor: [8.0, 1.53],
    size: 0.43, spacing: 0.08, bottomOffset: 1.7, 
    linkId: 1, intensity: 1.12, seed: 7.4 },
  { id: 'blog', text: 'BLOG',
    navRange: [0, 4], anchor: [-0.1, 0.6],
    size: 0.45, spacing: 0.08, bottomOffset: 2.32, 
    linkId: 2, intensity: 1.16, seed: 12.7 },
  { id: 'about', text: 'ABOUT',
    navRange: [0, 5], anchor: [-1.0, -0.63],
    size: 0.43, spacing: 0.08, bottomOffset: 1.38, 
    linkId: 3, intensity: 1.1, seed: 18.3 },
];

export const LinkStreams = forwardRef<Mesh, Props>(function LinkStreams(
  { onMaterialReady },
  forwardedRef,
) {
  const exr = useLoader(EXRLoader, '/textures/terrain/heightmap.exr');
  const atlas = useLoader(TextureLoader, '/textures/text/stream-atlas.png');
  const materialRef = useRef<ShaderMaterial>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const hoverValues = useRef([0, 0, 0, 0]);
  const glitchValues = useRef([0, 0, 0, 0]);
  const { elevation, seaLevel } = useTerrainControls();
  const { displacementMap, shellBase } = useMemo(
    () => getTerrainTextMaps(toHeightmapImage(exr.image)),
    [exr],
  );
  const geometry = useMemo(() => buildLinkStreamGeometry(LINK_STREAMS), []);
  const uniforms = useMemo(() => ({
    heightmap: { value: displacementMap },
    elevation: { value: TERRAIN_CONFIG.material.elevation },
    contrast: { value: TERRAIN_CONFIG.material.contrast },
    seaLevel: { value: TERRAIN_CONFIG.material.seaLevel },
    planeSize: { value: TERRAIN_CONFIG.mesh.planeSize },
    meshY: { value: TERRAIN_CONFIG.mesh.position[1] },
    uLift: { value: 0.075 },
    uTime: { value: 0 },
    uFade: { value: 1 },
    uHover: { value: new Vector4() },
    uGlitch: { value: new Vector4() },
    uAtlas: { value: atlas },
    uDecorationColor: { value: new Color(TERRAIN_CONFIG.contours.minorColor) },
    uLinkColor: { value: new Color(TERRAIN_CONFIG.contours.majorColor) },
    uHotColor: { value: new Color(TERRAIN_CONFIG.contours.pulseColor) },
  }), [atlas, displacementMap]);

  useEffect(() => configureSdfAtlas(atlas), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    onMaterialReady?.(materialRef.current);
    return () => onMaterialReady?.(null);
  }, [onMaterialReady]);
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.elevation.value = elevation;
    materialRef.current.uniforms.seaLevel.value = seaLevel;
  }, [elevation, seaLevel]);
  useEffect(() => {
    if (hoveredLink !== null) glitchValues.current[hoveredLink] = 1;
  }, [hoveredLink]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value += delta;
    for (let index = 0; index < 4; index++) {
      const target = hoveredLink === index ? 1 : 0;
      hoverValues.current[index] += (target - hoverValues.current[index]) * Math.min(1, delta * 9);
      glitchValues.current[index] *= Math.exp(-delta * 3.6);
    }
    material.uniforms.uHover.value.fromArray(hoverValues.current);
    material.uniforms.uGlitch.value.fromArray(glitchValues.current);
  });

  return (
    <>
      <mesh ref={forwardedRef} geometry={geometry} frustumCulled={false} renderOrder={4}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>

      {LINK_STREAMS.map((run) => {
        const position: [number, number, number] = [
          run.anchor[0],
          sampleTerrainHeight(shellBase, run.anchor[0], run.anchor[1], elevation, seaLevel)
            + run.bottomOffset
            + linkStreamWorldHeight(run) * 0.5,
          run.anchor[1],
        ];
        return (
          <Html key={run.id} position={position} center zIndexRange={[30, 10]}>
            <div
              className="stream-hit-target stream-hit-target--vertical"
              onPointerEnter={() => setHoveredLink(run.linkId)}
              onPointerLeave={() => setHoveredLink(null)}
            />
          </Html>
        );
      })}
    </>
  );
});
