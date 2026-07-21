'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 } from 'three';
import { EXRLoader } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
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
    const mat = surfaceMatRef.current;
    if (!mat) return;
    mat.uniforms.elevation.value     = elevation;
    mat.uniforms.seaLevel.value      = seaLevel;
    mat.uniforms.baseColor.value.set(baseColor);
    mat.uniforms.ridgeColor.value.set(ridgeColor);
    mat.uniforms.lightColor.value.set(lightColor);
    mat.uniforms.lightPos.value.set(lightX, lightY, lightZ);
    mat.uniforms.lightIntensity.value = lightIntensity;
    mat.uniforms.lightFalloff.value   = lightFalloff;
    mat.uniforms.light2Color.value.set(light2Color);
    mat.uniforms.light2Pos.value.set(light2X, light2Y, light2Z);
    mat.uniforms.light2Intensity.value = light2Intensity;
    mat.uniforms.light2Falloff.value   = light2Falloff;
    mat.uniforms.shadowStrength.value = shadowStrength;
    mat.uniforms.shadowBias.value = shadowBias;
  }, [elevation, seaLevel, baseColor, ridgeColor, lightColor, lightX, lightY, lightZ,
      lightIntensity, lightFalloff, light2Color, light2X, light2Y, light2Z,
      light2Intensity, light2Falloff, shadowStrength, shadowBias]);

  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      heightmap:      { value: displacementMap },
      gradientMap:    { value: gradientMap },
      elevation:      { value: TERRAIN_CONFIG.material.elevation },
      contrast:       { value: TERRAIN_CONFIG.material.contrast },
      seaLevel:       { value: TERRAIN_CONFIG.material.seaLevel },
      baseColor:      { value: new Color(TERRAIN_CONFIG.material.baseColor) },
      ridgeColor:     { value: new Color(TERRAIN_CONFIG.material.ridgeColor) },
      lightColor:     { value: new Color(TERRAIN_CONFIG.material.lightColor) },
      lightPos:       { value: new Vector3(TERRAIN_CONFIG.material.lightX, TERRAIN_CONFIG.material.lightY, TERRAIN_CONFIG.material.lightZ) },
      lightIntensity: { value: TERRAIN_CONFIG.material.lightIntensity },
      lightFalloff:   { value: TERRAIN_CONFIG.material.lightFalloff },
      light2Color:    { value: new Color(TERRAIN_CONFIG.material.light2Color) },
      light2Pos:      { value: new Vector3(TERRAIN_CONFIG.material.light2X, TERRAIN_CONFIG.material.light2Y, TERRAIN_CONFIG.material.light2Z) },
      light2Intensity: { value: TERRAIN_CONFIG.material.light2Intensity },
      light2Falloff:  { value: TERRAIN_CONFIG.material.light2Falloff },
      shadowStrength: { value: TERRAIN_CONFIG.material.shadowStrength },
      shadowBias:     { value: TERRAIN_CONFIG.material.shadowBias },
      planeSize:      { value: TERRAIN_CONFIG.mesh.planeSize },
      edgeFeather:    { value: TERRAIN_CONFIG.mesh.edgeFeather },
      meshY:          { value: TERRAIN_CONFIG.mesh.position[1] },
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
