'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { EXRLoader } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { bakeTerrainMaps, type HeightmapImage } from '@/lib/terrain/bake';
import { azElToDir } from '@/lib/terrain/math';
import vertexShader from '@/shaders/terrain.vert';
import fragmentShader from '@/shaders/terrain.frag';
import { useTerrainControls } from './useTerrainControls';

export function TerrainMesh() {
  const exr = useLoader(EXRLoader, '/textures/heightmap.exr');
  const surfaceMatRef = useRef<ShaderMaterial>(null);

  const { displacementMap, gradientMap } = useMemo(
    () => bakeTerrainMaps(exr.image as unknown as HeightmapImage),
    [exr],
  );

  const {
    elevation, seaLevel, fadeEnabled, fadeHeight, fadeFalloff,
    baseColor, ridgeColor, lightAzimuth, lightElevation, lightIntensity,
  } = useTerrainControls();

  useEffect(() => {
    const mat = surfaceMatRef.current;
    if (!mat) return;
    mat.uniforms.elevation.value     = elevation;
    mat.uniforms.seaLevel.value      = seaLevel;
    mat.uniforms.fadeEnabled.value   = fadeEnabled;
    mat.uniforms.fadeHeight.value    = fadeHeight;
    mat.uniforms.fadeFalloff.value   = fadeFalloff;
    mat.uniforms.baseColor.value.set(baseColor);
    mat.uniforms.ridgeColor.value.set(ridgeColor);
    mat.uniforms.lightDir.value.copy(azElToDir(lightAzimuth, lightElevation));
    mat.uniforms.lightIntensity.value = lightIntensity;
  }, [elevation, seaLevel, fadeEnabled, fadeHeight, fadeFalloff, baseColor, ridgeColor, lightAzimuth, lightElevation, lightIntensity]);

  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      heightmap:      { value: displacementMap },
      gradientMap:    { value: gradientMap },
      elevation:      { value: TERRAIN_CONFIG.material.elevation },
      contrast:       { value: TERRAIN_CONFIG.material.contrast },
      seaLevel:       { value: TERRAIN_CONFIG.material.seaLevel },
      fadeEnabled:    { value: TERRAIN_CONFIG.material.fadeEnabled },
      fadeHeight:     { value: TERRAIN_CONFIG.material.fadeHeight },
      fadeFalloff:    { value: TERRAIN_CONFIG.material.fadeFalloff },
      baseColor:      { value: new Color(TERRAIN_CONFIG.material.baseColor) },
      ridgeColor:     { value: new Color(TERRAIN_CONFIG.material.ridgeColor) },
      lightDir:       { value: azElToDir(TERRAIN_CONFIG.material.lightAzimuth, TERRAIN_CONFIG.material.lightElevation) },
      lightIntensity: { value: TERRAIN_CONFIG.material.lightIntensity },
    },
  ]), [displacementMap, gradientMap]);

  const geometry = useMemo(
    () => new PlaneGeometry(TERRAIN_CONFIG.mesh.planeSize, TERRAIN_CONFIG.mesh.planeSize, TERRAIN_CONFIG.mesh.segments, TERRAIN_CONFIG.mesh.segments),
    [],
  );

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={TERRAIN_CONFIG.mesh.position}>
      <shaderMaterial
        ref={surfaceMatRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        fog
      />
    </mesh>
  );
}
