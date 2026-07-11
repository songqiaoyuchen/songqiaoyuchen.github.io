'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  MathUtils,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import { EXRLoader } from 'three-stdlib';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { bakeTerrainMaps, bakeShellHeightMap, type HeightmapImage } from '@/lib/terrain/bake';
import vertexShader from '@/shaders/contour.vert';
import fragmentShader from '@/shaders/contour.frag';
import { useTerrainControls } from '../debug/useTerrainControls';
import { useContourControls } from '../debug/useContourControls';

const S = TERRAIN_CONFIG.shell;

export function Contour({ hovered }: { hovered: boolean }) {
  const exr = useLoader(EXRLoader, '/textures/hm.exr');
  const matRef = useRef<ShaderMaterial>(null);
  const introStart = useRef<number | null>(null);
  const introScanProgress = useRef(0);

  const { elevation, seaLevel } = useTerrainControls();
  const shell = useContourControls();

  const { shellBase } = useMemo(
    () => bakeTerrainMaps(exr.image as unknown as HeightmapImage),
    [exr],
  );

  const shellHeightMap = useMemo(
    () => bakeShellHeightMap(shellBase, shell.smoothIterations, S.smoothFactor),
    [shellBase, shell.smoothIterations],
  );

  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      uHeightmap:  { value: null },
      elevation:   { value: TERRAIN_CONFIG.material.elevation },
      contrast:    { value: TERRAIN_CONFIG.material.contrast },
      seaLevel:    { value: TERRAIN_CONFIG.material.seaLevel },
      uShellLift:  { value: S.lift },

      uTime:          { value: 0 },
      uHover:         { value: 0 },
      uIntroProgress: { value: 0 },
      uIntroScanProgress: { value: 0 },
      uShellAlpha:    { value: S.alpha },

      uMajorEvery:          { value: S.majorEvery },
      uThickContourWidth:   { value: S.thickWidth },
      uThickIntensity:      { value: S.thickIntensity },
      uThickColor:          { value: new Color(S.thickColor) },

      uThinContourDensity: { value: S.thinDensity },
      uThinContourWidth:   { value: S.thinWidth },
      uThinIntensity:      { value: S.thinIntensity },
      uThinColor:          { value: new Color(S.thinColor) },

      uFlowStrength: { value: S.flowStrength },
      uFlowSpeed:    { value: S.flowSpeed },
      uFlowColor:    { value: new Color(S.flowColor) },

      uHoverBoost: { value: S.hoverBoost },
    },
  ]), []);

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uHeightmap.value = shellHeightMap;
    return () => shellHeightMap.dispose();
  }, [shellHeightMap]);

  useEffect(() => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.elevation.value   = elevation;
    mat.uniforms.seaLevel.value    = seaLevel;
    mat.uniforms.uShellLift.value  = shell.shellLift;
    mat.uniforms.uShellAlpha.value = shell.shellAlpha;
    mat.uniforms.uMajorEvery.value          = shell.majorEvery;
    mat.uniforms.uThickContourWidth.value   = shell.thickWidth;
    mat.uniforms.uThickIntensity.value      = shell.thickIntensity;
    mat.uniforms.uThickColor.value.set(shell.thickColor);
    mat.uniforms.uThinContourDensity.value = shell.thinDensity;
    mat.uniforms.uThinContourWidth.value   = shell.thinWidth;
    mat.uniforms.uThinIntensity.value      = shell.thinIntensity;
    mat.uniforms.uThinColor.value.set(shell.thinColor);
    mat.uniforms.uFlowStrength.value = shell.flowStrength;
    mat.uniforms.uFlowSpeed.value    = shell.flowSpeed;
    mat.uniforms.uFlowColor.value.set(shell.flowColor);
    mat.uniforms.uHoverBoost.value   = shell.hoverBoost;
  }, [elevation, seaLevel, shell]);

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value += delta;

    // Smooth hover in/out — no snapping.
    mat.uniforms.uHover.value = MathUtils.damp(mat.uniforms.uHover.value, hovered ? 1 : 0, 3.5, delta);

    // Intro plays once from mount, eased; the shell stays interactive after.
    if (introStart.current === null) introStart.current = state.clock.elapsedTime;
    const t = MathUtils.clamp((state.clock.elapsedTime - introStart.current) / S.introDuration, 0, 1);
    mat.uniforms.uIntroProgress.value = t * t * (3 - 2 * t);

    introScanProgress.current = MathUtils.clamp(
      introScanProgress.current + delta * shell.introScanSpeed / S.introDuration,
      0,
      1,
    );
    const scanT = introScanProgress.current;
    mat.uniforms.uIntroScanProgress.value = scanT * scanT * (3 - 2 * scanT);
  });

  // Same vertex grid as the base mesh: with identical triangulation and shell
  // heights clamped >= base heights per texel, the lifted shell can never dip
  // below the base surface between vertices.
  const geometry = useMemo(
    () => new PlaneGeometry(TERRAIN_CONFIG.mesh.planeSize, TERRAIN_CONFIG.mesh.planeSize, TERRAIN_CONFIG.mesh.segments, TERRAIN_CONFIG.mesh.segments),
    [],
  );

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={TERRAIN_CONFIG.mesh.position}
      renderOrder={1}
    >
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
