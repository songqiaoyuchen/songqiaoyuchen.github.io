'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from 'three';
import { EXRLoader } from 'three-stdlib';
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import { bakeTerrainMaps, toHeightmapImage } from '@/lib/terrain/bake';
import vertexShader from '@/shaders/terrain.vert';
import fragmentShader from '@/shaders/terrain.frag';
import { useTerrainControls } from '../debug/useTerrainControls';

export function TerrainMesh() {
  const exr = useLoader(EXRLoader, '/textures/terrain/heightmap.exr');
  const surfaceMatRef = useRef<ShaderMaterial>(null);

  const { displacementMap, gradientMap } = useMemo(
    () => bakeTerrainMaps(toHeightmapImage(exr.image)),
    [exr],
  );

  const {
    elevation, seaLevel,
    baseColor, ridgeColor,
    lightColor, lightX, lightY, lightZ, lightIntensity, lightFalloff,
    light2Color, light2X, light2Y, light2Z, light2Intensity, light2Falloff,
    shadowStrength, shadowBias,
  } = useTerrainControls();

  useEffect(() => {
    const material = surfaceMatRef.current;
    if (!material) return;
    material.uniforms.elevation.value = elevation;
    material.uniforms.seaLevel.value = seaLevel;
    material.uniforms.baseColor.value.set(baseColor);
    material.uniforms.ridgeColor.value.set(ridgeColor);
    material.uniforms.lightColor.value.set(lightColor);
    material.uniforms.lightPos.value.set(lightX, lightY, lightZ);
    material.uniforms.lightIntensity.value = lightIntensity;
    material.uniforms.lightFalloff.value = lightFalloff;
    material.uniforms.light2Color.value.set(light2Color);
    material.uniforms.light2Pos.value.set(light2X, light2Y, light2Z);
    material.uniforms.light2Intensity.value = light2Intensity;
    material.uniforms.light2Falloff.value = light2Falloff;
    material.uniforms.shadowStrength.value = shadowStrength;
    material.uniforms.shadowBias.value = shadowBias;
  }, [elevation, seaLevel, baseColor, ridgeColor, lightColor, lightX, lightY, lightZ,
      lightIntensity, lightFalloff, light2Color, light2X, light2Y, light2Z,
      light2Intensity, light2Falloff, shadowStrength, shadowBias]);

  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      heightmap:      { value: displacementMap },
      gradientMap:    { value: gradientMap },
      elevation:      { value: TERRAIN_MATERIAL_CONFIG.elevation },
      contrast:       { value: TERRAIN_MATERIAL_CONFIG.contrast },
      seaLevel:       { value: TERRAIN_MATERIAL_CONFIG.seaLevel },
      baseColor:      { value: new Color(TERRAIN_MATERIAL_CONFIG.baseColor) },
      ridgeColor:     { value: new Color(TERRAIN_MATERIAL_CONFIG.ridgeColor) },
      lightColor:     { value: new Color(TERRAIN_MATERIAL_CONFIG.lightColor) },
      lightPos: {
        value: new Vector3(
          TERRAIN_MATERIAL_CONFIG.lightX,
          TERRAIN_MATERIAL_CONFIG.lightY,
          TERRAIN_MATERIAL_CONFIG.lightZ,
        ),
      },
      lightIntensity: { value: TERRAIN_MATERIAL_CONFIG.lightIntensity },
      lightFalloff:   { value: TERRAIN_MATERIAL_CONFIG.lightFalloff },
      light2Color:    { value: new Color(TERRAIN_MATERIAL_CONFIG.light2Color) },
      light2Pos: {
        value: new Vector3(
          TERRAIN_MATERIAL_CONFIG.light2X,
          TERRAIN_MATERIAL_CONFIG.light2Y,
          TERRAIN_MATERIAL_CONFIG.light2Z,
        ),
      },
      light2Intensity: { value: TERRAIN_MATERIAL_CONFIG.light2Intensity },
      light2Falloff:  { value: TERRAIN_MATERIAL_CONFIG.light2Falloff },
      shadowStrength: { value: TERRAIN_MATERIAL_CONFIG.shadowStrength },
      shadowBias:     { value: TERRAIN_MATERIAL_CONFIG.shadowBias },
      planeSize:      { value: TERRAIN_MESH_CONFIG.planeSize },
      edgeFeather:    { value: TERRAIN_MESH_CONFIG.edgeFeather },
      meshY:          { value: TERRAIN_MESH_CONFIG.position[1] },
    },
  ]), [displacementMap, gradientMap]);

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
