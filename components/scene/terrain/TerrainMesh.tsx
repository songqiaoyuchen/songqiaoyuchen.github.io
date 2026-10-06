// The displaced terrain surface; rendered only into CachedTerrain's offscreen cache.
// Uses the baked lighting map unless development controls change the lights (then relit live).
'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils } from 'three';
import type {TerrainControlValues} from '@/components/scene/controls/useSceneControls';
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import {
  requestTerrainGradient,
  useTerrainAssets,
} from '@/lib/terrain/assets';
import {bakeTerrainLightingMap} from '@/lib/terrain/lightingBake';
import vertexShader from '@/shaders/terrain/terrain.vert';
import fragmentShader from '@/shaders/terrain/terrain.frag';

export function TerrainMesh({settings}: {settings: TerrainControlValues}) {
  const surfaceMatRef = useRef<ShaderMaterial>(null);
  const {
    displacementMap,
    gradientMap: initialGradientMap,
    shellBase,
    staticLightingMap: bakedLightingMap,
  } = useTerrainAssets();
  const [gradientMap, setGradientMap] = useState(initialGradientMap);

  const {
    elevation, seaLevel,
    baseColor, ridgeColor,
    lightColor, lightX, lightY, lightZ, lightIntensity, lightFalloff,
    light2Color, light2X, light2Y, light2Z, light2Intensity, light2Falloff,
    shadowStrength, shadowBias,
  } = settings;

  const usesBakedLighting = process.env.NODE_ENV !== 'development' || (
    elevation === TERRAIN_MATERIAL_CONFIG.elevation
    && seaLevel === TERRAIN_MATERIAL_CONFIG.seaLevel
    && shadowBias === TERRAIN_MATERIAL_CONFIG.shadowBias
    && shadowStrength === TERRAIN_MATERIAL_CONFIG.shadowStrength
    && lightIntensity === TERRAIN_MATERIAL_CONFIG.lightIntensity
    && lightFalloff === TERRAIN_MATERIAL_CONFIG.lightFalloff
    && lightX === TERRAIN_MATERIAL_CONFIG.lightX
    && lightY === TERRAIN_MATERIAL_CONFIG.lightY
    && lightZ === TERRAIN_MATERIAL_CONFIG.lightZ
    && light2Intensity === TERRAIN_MATERIAL_CONFIG.light2Intensity
    && light2Falloff === TERRAIN_MATERIAL_CONFIG.light2Falloff
    && light2X === TERRAIN_MATERIAL_CONFIG.light2X
    && light2Y === TERRAIN_MATERIAL_CONFIG.light2Y
    && light2Z === TERRAIN_MATERIAL_CONFIG.light2Z
  );
  useEffect(() => {
    if (usesBakedLighting || gradientMap) return;
    let cancelled = false;
    void requestTerrainGradient().then((texture) => {
      if (!cancelled) setGradientMap(texture);
    }).catch((error: unknown) => {
      if (!cancelled) console.error('Unable to load the development gradient map.', error);
    });
    return () => {
      cancelled = true;
    };
  }, [gradientMap, usesBakedLighting]);
  const liveLightingMap = useMemo(() => {
    if (usesBakedLighting || !gradientMap) return null;
    return bakeTerrainLightingMap(shellBase, gradientMap, {
      elevation,
      seaLevel,
      shadowBias,
      shadowStrength,
      lightIntensity,
      lightFalloff,
      lightX,
      lightY,
      lightZ,
      light2Intensity,
      light2Falloff,
      light2X,
      light2Y,
      light2Z,
    });
  }, [
    shellBase,
    gradientMap,
    usesBakedLighting,
    elevation,
    seaLevel,
    shadowBias,
    shadowStrength,
    lightIntensity,
    lightFalloff,
    lightX,
    lightY,
    lightZ,
    light2Intensity,
    light2Falloff,
    light2X,
    light2Y,
    light2Z,
  ]);

  const staticLightingMap = liveLightingMap ?? bakedLightingMap;

  useEffect(() => () => liveLightingMap?.dispose(), [liveLightingMap]);

  useEffect(() => {
    const material = surfaceMatRef.current;
    if (!material) return;
    material.uniforms.elevation.value = elevation;
    material.uniforms.seaLevel.value = seaLevel;
    material.uniforms.baseColor.value.set(baseColor);
    material.uniforms.ridgeColor.value.set(ridgeColor);
    material.uniforms.lightColor.value.set(lightColor);
    material.uniforms.light2Color.value.set(light2Color);
  }, [
    elevation,
    seaLevel,
    baseColor,
    ridgeColor,
    lightColor,
    light2Color,
    staticLightingMap,
  ]);

  // Retain the loaded textures: their wrapping is configured after render.
  const uniforms = useMemo(() => ({
    ...UniformsUtils.clone(UniformsLib.fog),
    heightmap:      { value: displacementMap },
    staticLightingMap: { value: staticLightingMap },
    elevation:      { value: TERRAIN_MATERIAL_CONFIG.elevation },
    contrast:       { value: TERRAIN_MATERIAL_CONFIG.contrast },
    seaLevel:       { value: TERRAIN_MATERIAL_CONFIG.seaLevel },
    baseColor:      { value: new Color(TERRAIN_MATERIAL_CONFIG.baseColor) },
    ridgeColor:     { value: new Color(TERRAIN_MATERIAL_CONFIG.ridgeColor) },
    lightColor:     { value: new Color(TERRAIN_MATERIAL_CONFIG.lightColor) },
    light2Color:    { value: new Color(TERRAIN_MATERIAL_CONFIG.light2Color) },
    edgeFeather:    { value: TERRAIN_MESH_CONFIG.edgeFeather },
  }), [displacementMap, staticLightingMap]);

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
