'use client';

import {useLayoutEffect, useMemo, useRef} from 'react';
import {useTexture} from '@react-three/drei';
import {SRGBColorSpace, UniformsLib, UniformsUtils, Vector2, type ShaderMaterial, type Texture} from 'three';
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import {OIL_TERRAIN_CONFIG} from '@/config/scene/oil';
import type {TerrainControlValues} from '@/components/debug/useSceneControls';
import {useTerrainAssets} from '@/lib/terrain/assets';
import vertexShader from '@/shaders/oilTerrain.vert';
import fragmentShader from '@/shaders/oilTerrain.frag';

function configureOilTextures(textures: Texture[]) {
  textures[0].colorSpace = SRGBColorSpace;
  for (const texture of textures) {
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }
  // Relief is scalar data and deliberately keeps NoColorSpace.
}

export function OilTerrain({settings, onReady}: {
  settings: TerrainControlValues;
  onReady: () => void;
}) {
  const materialRef = useRef<ShaderMaterial>(null);
  const {displacementMap, staticLightingMap} = useTerrainAssets();
  const [pigmentMap, reliefMap] = useTexture(
    [OIL_TERRAIN_CONFIG.colorMap, OIL_TERRAIN_CONFIG.reliefMap], configureOilTextures,
  );
  const uniforms = useMemo(() => ({
    ...UniformsUtils.clone(UniformsLib.fog),
    heightmap: {value: displacementMap},
    pigmentMap: {value: pigmentMap},
    staticLightingMap: {value: staticLightingMap},
    reliefMap: {value: reliefMap},
    reliefTexel: {value: new Vector2(
      1 / (reliefMap.image as HTMLImageElement).width,
      1 / (reliefMap.image as HTMLImageElement).height,
    )},
    elevation: {value: TERRAIN_MATERIAL_CONFIG.elevation},
    contrast: {value: TERRAIN_MATERIAL_CONFIG.contrast},
    seaLevel: {value: TERRAIN_MATERIAL_CONFIG.seaLevel},
    edgeFeather: {value: TERRAIN_MESH_CONFIG.edgeFeather},
    exposure: {value: OIL_TERRAIN_CONFIG.exposure},
    lightThreshold: {value: OIL_TERRAIN_CONFIG.lightThreshold},
    lightContrast: {value: OIL_TERRAIN_CONFIG.lightContrast},
    reliefStrength: {value: OIL_TERRAIN_CONFIG.reliefStrength},
  }), [displacementMap, staticLightingMap, pigmentMap, reliefMap]);

  useLayoutEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.elevation.value = settings.elevation;
    material.uniforms.seaLevel.value = settings.seaLevel;
    onReady();
  }, [onReady, settings.elevation, settings.seaLevel, uniforms]);

  return (
    <mesh position={TERRAIN_MESH_CONFIG.position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[TERRAIN_MESH_CONFIG.planeSize, TERRAIN_MESH_CONFIG.planeSize,
        TERRAIN_MESH_CONFIG.segments, TERRAIN_MESH_CONFIG.segments]} />
      <shaderMaterial ref={materialRef} vertexShader={vertexShader} fragmentShader={fragmentShader}
        uniforms={uniforms} transparent fog />
    </mesh>
  );
}
