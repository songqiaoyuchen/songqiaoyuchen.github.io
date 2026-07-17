'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import { EXRLoader } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { bakeTerrainMaps, bakeShellGrid, type HeightmapImage } from '@/lib/terrain/bake';
import { extractIsolines } from '@/lib/terrain/isolines';
import { buildContourTubeGeometry } from '@/lib/terrain/lineTube';
import vertexShader from '@/shaders/contourLines.vert';
import fragmentShader from '@/shaders/contourLines.frag';
import { useTerrainControls } from '../debug/useTerrainControls';
import { useContourControls } from '../debug/useContourControls';

const C = TERRAIN_CONFIG.contours;
const MESH = TERRAIN_CONFIG.mesh;

export function ContourLines() {
  const exr = useLoader(EXRLoader, '/textures/hm.exr');
  const matRef = useRef<ShaderMaterial>(null);
  const introStart = useRef<number | null>(null);

  const { elevation, seaLevel } = useTerrainControls();
  const lines = useContourControls();

  const { shellBase } = useMemo(
    () => bakeTerrainMaps(exr.image as unknown as HeightmapImage),
    [exr],
  );

  const shellGrid = useMemo(
    () => bakeShellGrid(shellBase, lines.smoothIterations, C.smoothFactor),
    [shellBase, lines.smoothIterations],
  );

  const isolines = useMemo(
    () => extractIsolines(shellGrid, {
      levels: lines.levels,
      contrast: TERRAIN_CONFIG.material.contrast,
      seaLevel,
      planeSize: MESH.planeSize,
      downsample: C.downsample,
      rdpEpsilon: C.rdpEpsilon,
      chaikinIterations: lines.chaikinIterations,
      resampleSpacing: lines.resampleSpacing,
      minLength: C.minLength,
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
    uIntroTravelSpeed: { value: C.introTravelSpeed },

    uElevation:  { value: TERRAIN_CONFIG.material.elevation },
    uLift:       { value: C.lift },
    uMeshY:      { value: MESH.position[1] },
    uMinorRadius: { value: C.minorRadius },
    uMajorRadius: { value: C.majorRadius },
    uDepthBias:   { value: C.depthBias },

    uMajorColor:     { value: new Color(C.majorColor) },
    uMajorIntensity: { value: C.majorIntensity },
    uMinorColor:     { value: new Color(C.minorColor) },
    uMinorIntensity: { value: C.minorIntensity },
    uMinorBase:      { value: C.minorBase },
    uShadowIntensity: { value: C.shadowIntensity },

    uPulseColor:     { value: new Color(C.pulseColor) },
    uPulseTint:      { value: C.pulseTint },
    uPulseSpeed:     { value: C.pulseSpeed },
    uPulseScale:     { value: C.pulseScale },
    uPulseSharpness: { value: C.pulseSharpness },
  }), []);

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    const u = mat.uniforms;
    u.uElevation.value = elevation;
    u.uLift.value = lines.lift;
    u.uMinorRadius.value = lines.minorRadius;
    u.uMajorRadius.value = lines.majorRadius;
    u.uDepthBias.value = lines.depthBias;
    u.uMajorColor.value.set(lines.majorColor);
    u.uMajorIntensity.value = lines.majorIntensity;
    u.uMinorColor.value.set(lines.minorColor);
    u.uMinorIntensity.value = lines.minorIntensity;
    u.uMinorBase.value = lines.minorBase;
    u.uShadowIntensity.value = lines.shadowIntensity;
    u.uPulseColor.value.set(lines.pulseColor);
    u.uPulseTint.value = lines.pulseTint;
    u.uPulseSpeed.value = lines.pulseSpeed;
    u.uPulseScale.value = lines.pulseScale;
    u.uPulseSharpness.value = lines.pulseSharpness;
  }, [elevation, lines]);

  useEffect(() => {
    introStart.current = null;
    if (matRef.current) matRef.current.uniforms.uIntroTime.value = 0;
  }, [geometry]);

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value += delta;
    if (introStart.current === null) introStart.current = state.clock.elapsedTime;
    mat.uniforms.uIntroTime.value = state.clock.elapsedTime - introStart.current;
  });

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={1}>
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
}
