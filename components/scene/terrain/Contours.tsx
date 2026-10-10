// Glowing contour lines over the homepage terrain: tube geometry from the worker, pulse and intro sweep in shaders.
// A second instance draws About's map contours: its own settings, lit like the terrain beneath, dimmed away
// from the route. With travelRide, the lines ride onto the globe with the terrain on the way to Travel
// (contours.vert, from the patch frame TravelGlobe publishes), so the home map flows into the globe's.
'use client';

import {forwardRef, useEffect, useMemo, useRef, useState} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  MathUtils,
  Vector2,
  Vector3,
  Vector4,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import type {DataTexture, DepthTexture, Group, Mesh} from 'three';
import {CONTOUR_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {
  ContourControlValues,
  TerrainControlValues,
} from '@/components/scene/controls/useSceneControls';
import {
  requestContourBuffers,
  useTerrainAssets,
  useTerrainContourBuffers,
} from '@/lib/terrain/assets';
import {
  getContourBuildKey,
  getContourBuildOptions,
} from '@/lib/terrain/contourOptions';
import {createContourTubeGeometry} from '@/lib/terrain/lineTube';
import vertexShader from '@/shaders/terrain/contours.vert';
import fragmentShader from '@/shaders/terrain/contours.frag';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {useCameraFrameState} from '../camera/CameraFrameState';

// While riding to Travel, shrinking tubes keep this on-screen radius (device pixels) and dim instead.
const RIDE_MIN_PIXELS = 0.75;

const CONTOURS = CONTOUR_CONFIG;
const TERRAIN_MESH = TERRAIN_MESH_CONFIG;

/** Dim lines with plan distance from a centre: [x, z, dim start, dim end] in world units, and the
 *  brightness kept beyond the end. */
export type ContourFocus = readonly [number, number, number, number, number];

/** Light lines like the terrain beneath: brightness kept on unlit ground, and the baked light at full. */
export type ContourLighting = readonly [number, number];

type ContoursProps = {
  hidden?: boolean;
  /** Ride onto the globe with the terrain while the Travel morph runs (the homepage lines). */
  travelRide?: boolean;
  focus?: ContourFocus | null;
  lighting?: ContourLighting | null;
  /** Minimum on-screen tube radius in device pixels, so distant lines dim rather than break up. */
  minPixels?: number;
  contourSettings: ContourControlValues;
  terrainDepthTexture: DepthTexture | null;
  terrainSettings: TerrainControlValues;
};

export const Contours = forwardRef<Mesh, ContoursProps>(function Contours(
  {
    hidden = false, travelRide = false, focus = null, lighting = null, minPixels = 0,
    contourSettings: lines, terrainDepthTexture, terrainSettings,
  },
  forwardedRef,
) {
  const matRef = useRef<ShaderMaterial>(null);
  const cameraFrameState = useCameraFrameState();
  const layerRef = useRef<Group>(null);
  const introStart = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  const {elevation, seaLevel, edgeFade} = terrainSettings;
  const [fadeStart, fadeEnd] = edgeFade;

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
    uEdgeFade:    { value: new Vector2(...TERRAIN_MESH.edgeFade) },
    uTerrainDepth: {value: null},
    uUseTerrainDepth: {value: 0},
    uFocus: {value: new Vector4()},
    uFocusFloor: {value: 0},
    uUseFocus: {value: 0},
    uLightingMap: {value: null as DataTexture | null},
    uLit: {value: new Vector2()},
    uUseLit: {value: 0},
    uMinPixels: {value: 0},
    uViewportHeight: {value: 1},
    uMorph: {value: 0},
    uGlobeCenter: {value: new Vector3()},
    uGlobeRadius: {value: 1},
    uPatchAnchor: {value: new Vector3(0, 1, 0)},
    uPatchEast: {value: new Vector3(-1, 0, 0)},
    uPatchNorth: {value: new Vector3(0, 0, 1)},
    uPatchPivot: {value: new Vector2()},
    uPatchScale: {value: 1},
    uPatchRelief: {value: 1},
    uSeaUnits: {value: 0},
    uDatumY: {value: 0},

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
    uniforms.uEdgeFade.value.set(fadeStart, fadeEnd);
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
  }, [elevation, fadeEnd, fadeStart, lines]);

  useEffect(() => {
    const material = matRef.current;
    if (!material) return;
    material.uniforms.uTerrainDepth.value = terrainDepthTexture;
    material.uniforms.uUseTerrainDepth.value = terrainDepthTexture ? 1 : 0;
  }, [terrainDepthTexture]);

  const [focusX, focusZ, focusStart, focusEnd, focusFloor] = focus ?? [0, 0, 0, 0, 1];
  useEffect(() => {
    const material = matRef.current;
    if (!material) return;
    material.uniforms.uFocus.value.set(focusX, focusZ, focusStart, focusEnd);
    material.uniforms.uFocusFloor.value = focusFloor;
    material.uniforms.uUseFocus.value = focus ? 1 : 0;
  }, [focus, focusEnd, focusFloor, focusStart, focusX, focusZ]);

  const bufferHeight = useThree((state) => state.size.height * state.viewport.dpr);
  useEffect(() => {
    const material = matRef.current;
    if (!material) return;
    material.uniforms.uViewportHeight.value = bufferHeight;
  }, [bufferHeight]);

  const {staticLightingMap} = useTerrainAssets();
  const [litFloor, litFull] = lighting ?? [1, 1];
  useEffect(() => {
    const material = matRef.current;
    if (!material) return;
    material.uniforms.uLightingMap.value = staticLightingMap;
    material.uniforms.uLit.value.set(litFloor, litFull);
    material.uniforms.uUseLit.value = lighting ? 1 : 0;
  }, [lighting, litFloor, litFull, staticLightingMap]);

  useEffect(() => {
    introStart.current = null;
    if (matRef.current) matRef.current.uniforms.uIntroTime.value = 0;
  }, [geometry]);

  // After TravelGlobe (0.1) has placed the patch for the frame.
  useFrame((state, delta) => {
    const material = matRef.current;
    if (!material) return;
    material.uniforms.uTime.value += delta;
    const {travelMorph, travelPatch: patch} = cameraFrameState.current;
    const riding = travelRide && travelMorph > 0 && travelMorph < 1;
    material.uniforms.uMorph.value = riding ? travelMorph : 0;
    if (riding) {
      const {uGlobeCenter, uGlobeRadius, uPatchAnchor, uPatchEast, uPatchNorth, uPatchPivot, uPatchScale,
        uPatchRelief, uSeaUnits, uDatumY} = material.uniforms;
      uGlobeCenter.value.copy(patch.center);
      uGlobeRadius.value = patch.radius;
      uPatchAnchor.value.copy(patch.anchor);
      uPatchEast.value.copy(patch.east);
      uPatchNorth.value.copy(patch.north);
      uPatchPivot.value.set(patch.pivot.x - TERRAIN_MESH.position[0], TERRAIN_MESH.position[2] - patch.pivot.z);
      uPatchScale.value = patch.scale;
      uPatchRelief.value = patch.relief;
      uSeaUnits.value = patch.seaUnits;
      uDatumY.value = patch.datumY;
    }
    material.uniforms.uMinPixels.value = riding ? Math.max(minPixels, RIDE_MIN_PIXELS) : minPixels;
    const visibility = material.uniforms.uVisibility;
    // Settings that differ from the bake wait for their own geometry rather than showing the baked lines.
    const pending = contourKey !== initialContours.key && geometryBuffers === initialContours.buffers;
    // Lines hidden for Travel ride a little way with the terrain, dissolving as the landscape recedes into the
    // regional ground, which has no glowing lines of its own.
    const target = pending ? 0
      : hidden ? (riding ? 1 - MathUtils.smoothstep(travelMorph, 0.04, 0.25) : 0) : 1;
    visibility.value = reducedMotion || Math.abs(visibility.value - target) < 0.001
      ? target
      : visibility.value + (target - visibility.value) * (1 - Math.exp(-4 * Math.min(delta, 1 / 30)));
    if (layerRef.current) layerRef.current.visible = visibility.value > 0;
    if (introStart.current === null) introStart.current = state.clock.elapsedTime;
    material.uniforms.uIntroTime.value = state.clock.elapsedTime - introStart.current;
  }, 0.2);

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
