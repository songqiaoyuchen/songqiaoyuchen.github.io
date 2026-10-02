'use client';

import {forwardRef, useEffect, useMemo, useRef, useState} from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import type {DepthTexture, Group, Mesh} from 'three';
import {CONTOUR_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {
  ContourControlValues,
  TerrainControlValues,
} from '@/components/debug/useSceneControls';
import {
  requestContourBuffers,
  useTerrainContourBuffers,
} from '@/lib/terrain/assets';
import {
  getContourBuildKey,
  getContourBuildOptions,
} from '@/lib/terrain/contourOptions';
import {createContourTubeGeometry} from '@/lib/terrain/lineTube';
import vertexShader from '@/shaders/contourLines.vert';
import fragmentShader from '@/shaders/contourLines.frag';
import {useReducedMotion} from '@/hooks/useReducedMotion';

const CONTOURS = CONTOUR_CONFIG;
const TERRAIN_MESH = TERRAIN_MESH_CONFIG;

type ContourLinesProps = {
  hidden?: boolean;
  contourSettings: ContourControlValues;
  terrainDepthTexture: DepthTexture | null;
  terrainSettings: TerrainControlValues;
};

export const ContourLines = forwardRef<Mesh, ContourLinesProps>(function ContourLines(
  {hidden = false, contourSettings: lines, terrainDepthTexture, terrainSettings},
  forwardedRef,
) {
  const matRef = useRef<ShaderMaterial>(null);
  const layerRef = useRef<Group>(null);
  const introStart = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  const {elevation, seaLevel} = terrainSettings;

  const initialContours = useTerrainContourBuffers();
  const contourOptions = useMemo(
    () => getContourBuildOptions(lines, seaLevel),
    [lines, seaLevel],
  );
  const contourKey = useMemo(
    () => getContourBuildKey(contourOptions),
    [contourOptions],
  );
  const [geometryBuffers, setGeometryBuffers] = useState(initialContours.buffers);

  useEffect(() => {
    if (contourKey === initialContours.key) return;
    let cancelled = false;
    void requestContourBuffers(contourOptions).then((buffers) => {
      if (!cancelled) setGeometryBuffers(buffers);
    }).catch((error: unknown) => {
      if (!cancelled) console.error('Unable to rebuild terrain contours.', error);
    });
    return () => {
      cancelled = true;
    };
  }, [contourKey, contourOptions, initialContours.key]);

  const geometry = useMemo(
    () => createContourTubeGeometry(geometryBuffers),
    [geometryBuffers],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(() => ({
    ...UniformsUtils.clone(UniformsLib.fog),
    uTime:            { value: 0 },
    uVisibility:      { value: 1 },
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
    const visibility = material.uniforms.uVisibility;
    const target = hidden ? 0 : 1;
    visibility.value = reducedMotion || Math.abs(visibility.value - target) < 0.001
      ? target
      : visibility.value + (target - visibility.value) * (1 - Math.exp(-4 * Math.min(delta, 1 / 30)));
    if (layerRef.current) layerRef.current.visible = visibility.value > 0;
    if (introStart.current === null) introStart.current = state.clock.elapsedTime;
    material.uniforms.uIntroTime.value = state.clock.elapsedTime - introStart.current;
  });

  return (
    <group ref={layerRef}><mesh ref={forwardedRef} geometry={geometry} frustumCulled={false} renderOrder={1}>
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
    </mesh></group>
  );
});
