'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import { EXRLoader } from 'three-stdlib';
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {TerrainControlValues} from '@/components/debug/useSceneControls';
import { bakeTerrainMaps, toHeightmapImage } from '@/lib/terrain/bake';
import {bakeTerrainLightingMap} from '@/lib/terrain/lightingBake';
import vertexShader from '@/shaders/terrain.vert';
import fragmentShader from '@/shaders/terrain.frag';

export function TerrainMesh({settings}: {settings: TerrainControlValues}) {
  const exr = useLoader(EXRLoader, '/textures/terrain/heightmap.exr');
  const surfaceMatRef = useRef<ShaderMaterial>(null);

  const { displacementMap, gradientMap, shellBase } = useMemo(
    () => bakeTerrainMaps(toHeightmapImage(exr.image)),
    [exr],
  );

  const {
    elevation, seaLevel,
    baseColor, ridgeColor,
    lightColor, lightX, lightY, lightZ, lightIntensity, lightFalloff,
    light2Color, light2X, light2Y, light2Z, light2Intensity, light2Falloff,
    shadowStrength, shadowBias,
  } = settings;

  const staticLightingMap = useMemo(() => bakeTerrainLightingMap(shellBase, gradientMap, {
    elevation,
    seaLevel,
    shadowBias,
    shadowStrength,
    lightColor,
    lightIntensity,
    lightFalloff,
    lightX,
    lightY,
    lightZ,
    light2Color,
    light2Intensity,
    light2Falloff,
    light2X,
    light2Y,
    light2Z,
  }), [
    shellBase,
    gradientMap,
    elevation,
    seaLevel,
    shadowBias,
    shadowStrength,
    lightColor,
    lightIntensity,
    lightFalloff,
    lightX,
    lightY,
    lightZ,
    light2Color,
    light2Intensity,
    light2Falloff,
    light2X,
    light2Y,
    light2Z,
  ]);

  useEffect(
    () => () => staticLightingMap.dispose(),
    [staticLightingMap],
  );

  useEffect(() => {
    const material = surfaceMatRef.current;
    if (!material) return;
    material.uniforms.elevation.value = elevation;
    material.uniforms.seaLevel.value = seaLevel;
    material.uniforms.baseColor.value.set(baseColor);
    material.uniforms.ridgeColor.value.set(ridgeColor);
  }, [elevation, seaLevel, baseColor, ridgeColor, staticLightingMap]);

  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      heightmap:      { value: displacementMap },
      staticLightingMap: { value: staticLightingMap },
      elevation:      { value: TERRAIN_MATERIAL_CONFIG.elevation },
      contrast:       { value: TERRAIN_MATERIAL_CONFIG.contrast },
      seaLevel:       { value: TERRAIN_MATERIAL_CONFIG.seaLevel },
      baseColor:      { value: new Color(TERRAIN_MATERIAL_CONFIG.baseColor) },
      ridgeColor:     { value: new Color(TERRAIN_MATERIAL_CONFIG.ridgeColor) },
      edgeFeather:    { value: TERRAIN_MESH_CONFIG.edgeFeather },
    },
  ]), [displacementMap, staticLightingMap]);

  const geometry = useMemo(
    () => new PlaneGeometry(
      TERRAIN_MESH_CONFIG.planeSize,
      TERRAIN_MESH_CONFIG.planeSize,
      TERRAIN_MESH_CONFIG.segments,
      TERRAIN_MESH_CONFIG.segments,
    ),
    [],
  );

  return (
    <mesh
      geometry={geometry}
      position={TERRAIN_MESH_CONFIG.position}
      rotation={[-Math.PI / 2, 0, 0]}
    >
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
