'use client';

import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import type {DepthTexture, Mesh} from 'three';
import {CONTOUR_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {
  ContourControlValues,
  TerrainControlValues,
} from '@/components/debug/useSceneControls';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {bakeShellGrid} from '@/lib/terrain/shell';
import { extractIsolines } from '@/lib/terrain/isolines';
import { buildContourTubeGeometry } from '@/lib/terrain/lineTube';
import vertexShader from '@/shaders/contourLines.vert';
import fragmentShader from '@/shaders/contourLines.frag';

const CONTOURS = CONTOUR_CONFIG;
const TERRAIN_MESH = TERRAIN_MESH_CONFIG;

type ContourLinesProps = {
  contourSettings: ContourControlValues;
  terrainDepthTexture: DepthTexture | null;
  terrainSettings: TerrainControlValues;
};

export const ContourLines = forwardRef<Mesh, ContourLinesProps>(function ContourLines(
  {contourSettings: lines, terrainDepthTexture, terrainSettings},
  forwardedRef,
) {
  const matRef = useRef<ShaderMaterial>(null);
  const introStart = useRef<number | null>(null);

  const {elevation, seaLevel} = terrainSettings;

  const {shellBase} = useTerrainAssets();

  const shellGrid = useMemo(
    () => bakeShellGrid(shellBase, lines.smoothIterations, CONTOURS.smoothFactor),
    [shellBase, lines.smoothIterations],
  );

  const isolines = useMemo(
    () => extractIsolines(shellGrid, {
      levels: lines.levels,
      contrast: TERRAIN_MATERIAL_CONFIG.contrast,
      seaLevel,
      planeSize: TERRAIN_MESH.planeSize,
      downsample: CONTOURS.downsample,
      rdpEpsilon: CONTOURS.rdpEpsilon,
      chaikinIterations: lines.chaikinIterations,
      resampleSpacing: lines.resampleSpacing,
      minLength: CONTOURS.minLength,
      majorEvery: lines.majorEvery,
      majorMinHeight: lines.majorMinHeight,
      spacingJitter: lines.spacingJitter,
      shadowOffset: lines.shadowOffset,
      shadowChance: lines.shadowChance,
    }),
    [shellGrid, lines.levels, lines.chaikinIterations, lines.resampleSpacing, seaLevel,
     lines.majorEvery, lines.majorMinHeight, lines.spacingJitter, lines.shadowOffset,
     lines.shadowChance],
  );

  const geometry = useMemo(
    () => buildContourTubeGeometry(isolines),
    [isolines],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({
    ...UniformsUtils.clone(UniformsLib.fog),
    uTime:            { value: 0 },
    uIntroTime:       { value: 0 },
    uIntroTravelSpeed: { value: CONTOURS.introTravelSpeed },

    uElevation:  { value: TERRAIN_MATERIAL_CONFIG.elevation },
    uLift:       { value: CONTOURS.lift },
    uMeshY:      { value: TERRAIN_MESH.position[1] },
    uMinorRadius: { value: CONTOURS.minorRadius },
    uMajorRadius: { value: CONTOURS.majorRadius },
    uDepthBias:   { value: CONTOURS.depthBias },
    uPlaneSize:   { value: TERRAIN_MESH.planeSize },
    uEdgeFeather: { value: TERRAIN_MESH.edgeFeather },
    uTerrainDepth: {value: null},
    uUseTerrainDepth: {value: 0},

    uMajorColor:     { value: new Color(CONTOURS.majorColor) },
    uMajorIntensity: { value: CONTOURS.majorIntensity },
    uMinorColor:     { value: new Color(CONTOURS.minorColor) },
    uMinorIntensity: { value: CONTOURS.minorIntensity },
    uMinorBase:      { value: CONTOURS.minorBase },
    uShadowIntensity: { value: CONTOURS.shadowIntensity },

    uPulseColor:     { value: new Color(CONTOURS.pulseColor) },
    uPulseTint:      { value: CONTOURS.pulseTint },
    uPulseSpeed:     { value: CONTOURS.pulseSpeed },
    uPulseScale:     { value: CONTOURS.pulseScale },
    uPulseSharpness: { value: CONTOURS.pulseSharpness },
  }), []);

  useEffect(() => {
    const material = matRef.current;
    if (!material) return;
    const uniforms = material.uniforms;
    uniforms.uElevation.value = elevation;
    uniforms.uLift.value = lines.lift;
    uniforms.uMinorRadius.value = lines.minorRadius;
    uniforms.uMajorRadius.value = lines.majorRadius;
    uniforms.uDepthBias.value = lines.depthBias;
    uniforms.uMajorColor.value.set(lines.majorColor);
    uniforms.uMajorIntensity.value = lines.majorIntensity;
    uniforms.uMinorColor.value.set(lines.minorColor);
    uniforms.uMinorIntensity.value = lines.minorIntensity;
    uniforms.uMinorBase.value = lines.minorBase;
    uniforms.uShadowIntensity.value = lines.shadowIntensity;
    uniforms.uPulseColor.value.set(lines.pulseColor);
    uniforms.uPulseTint.value = lines.pulseTint;
    uniforms.uPulseSpeed.value = lines.pulseSpeed;
    uniforms.uPulseScale.value = lines.pulseScale;
    uniforms.uPulseSharpness.value = lines.pulseSharpness;
  }, [elevation, lines]);

  useEffect(() => {
    const material = matRef.current;
    if (!material) return;
    material.uniforms.uTerrainDepth.value = terrainDepthTexture;
    material.uniforms.uUseTerrainDepth.value = terrainDepthTexture ? 1 : 0;
  }, [terrainDepthTexture]);

  useEffect(() => {
    introStart.current = null;
    if (matRef.current) matRef.current.uniforms.uIntroTime.value = 0;
  }, [geometry]);

  useFrame((state, delta) => {
    const material = matRef.current;
    if (!material) return;
    material.uniforms.uTime.value += delta;
    if (introStart.current === null) introStart.current = state.clock.elapsedTime;
    material.uniforms.uIntroTime.value = state.clock.elapsedTime - introStart.current;
  });

  return (
    <mesh ref={forwardedRef} geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        fog
      />
    </mesh>
  );
});
