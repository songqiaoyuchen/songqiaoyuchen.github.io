'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  MathUtils,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
} from 'three';
import { EXRLoader } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { bakeTerrainMaps, bakeShellGrid, type HeightmapImage } from '@/lib/terrain/bake';
import { extractIsolines, findPeakOrigin } from '@/lib/terrain/isolines';
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

  const peak = useMemo(() => findPeakOrigin(shellGrid, MESH.planeSize), [shellGrid]);

  // Every fragment must end up inside the reveal front at intro's end:
  // reach from the peak to the farthest plane corner, plus the soft edge.
  const revealMaxRadius = useMemo(() => {
    const half = MESH.planeSize / 2;
    const dx = Math.max(Math.abs(peak[0] - half), Math.abs(peak[0] + half));
    const dz = Math.max(Math.abs(peak[1] - half), Math.abs(peak[1] + half));
    return Math.hypot(dx, dz) + C.revealEdge + 0.5;
  }, [peak]);

  const geometry = useMemo(() => {
    const isolines = extractIsolines(shellGrid, {
      levels: lines.levels,
      contrast: TERRAIN_CONFIG.material.contrast,
      seaLevel,
      planeSize: MESH.planeSize,
      downsample: C.downsample,
      rdpEpsilon: C.rdpEpsilon,
      chaikinIterations: lines.chaikinIterations,
      resampleSpacing: lines.resampleSpacing,
      minLength: C.minLength,
    });
    return buildContourTubeGeometry(isolines);
  }, [shellGrid, lines.levels, lines.chaikinIterations, lines.resampleSpacing, seaLevel]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Glow comes from the bloom post-pass, so a single line pass suffices.
  const uniforms = useMemo(() => ({
    ...UniformsUtils.clone(UniformsLib.fog),
    uTime:          { value: 0 },
    uIntroProgress: { value: 0 },

    uElevation:  { value: TERRAIN_CONFIG.material.elevation },
    uLift:       { value: C.lift },
    uMeshY:      { value: MESH.position[1] },
    uMajorEvery: { value: C.majorEvery },
    uLevels:     { value: C.levels },
    uMinorRadius: { value: C.minorRadius },
    uMajorRadius: { value: C.majorRadius },
    uDepthBias:   { value: C.depthBias },

    uPeakOrigin:      { value: new Vector2() },
    uRevealMaxRadius: { value: 1 },
    uRevealEdge:      { value: C.revealEdge },
    uRevealStagger:   { value: C.revealStagger },

    uMajorColor:     { value: new Color(C.majorColor) },
    uMajorIntensity: { value: C.majorIntensity },
    uMinorColor:     { value: new Color(C.minorColor) },
    uMinorIntensity: { value: C.minorIntensity },
    uMinorBase:      { value: C.minorBase },

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
    u.uMajorEvery.value = lines.majorEvery;
    u.uLevels.value = lines.levels;
    u.uMinorRadius.value = lines.minorRadius;
    u.uMajorRadius.value = lines.majorRadius;
    u.uDepthBias.value = lines.depthBias;
    u.uPeakOrigin.value.set(peak[0], peak[1]);
    u.uRevealMaxRadius.value = revealMaxRadius;
    u.uRevealEdge.value = lines.revealEdge;
    u.uRevealStagger.value = lines.revealStagger;
    u.uMajorColor.value.set(lines.majorColor);
    u.uMajorIntensity.value = lines.majorIntensity;
    u.uMinorColor.value.set(lines.minorColor);
    u.uMinorIntensity.value = lines.minorIntensity;
    u.uMinorBase.value = lines.minorBase;
    u.uPulseColor.value.set(lines.pulseColor);
    u.uPulseTint.value = lines.pulseTint;
    u.uPulseSpeed.value = lines.pulseSpeed;
    u.uPulseScale.value = lines.pulseScale;
    u.uPulseSharpness.value = lines.pulseSharpness;
  }, [elevation, peak, revealMaxRadius, lines]);

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value += delta;

    // Intro plays once from mount; after it completes, the only thing that
    // still animates is the pulse phase.
    if (introStart.current === null) introStart.current = state.clock.elapsedTime;
    const t = MathUtils.clamp(
      (state.clock.elapsedTime - introStart.current) / lines.introDuration, 0, 1,
    );
    mat.uniforms.uIntroProgress.value = t * t * (3 - 2 * t);
  });

  // Geometry positions are already in world space (y = normalized height,
  // scaled live in the vertex shader) — no mesh transform.
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
