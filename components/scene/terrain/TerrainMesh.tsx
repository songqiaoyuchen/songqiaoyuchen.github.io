// The displaced terrain surface; rendered only into CachedTerrain's offscreen cache.
// Uses the baked lighting map unless development controls change the lights (then relit live).
// On the way to Travel it rides onto the globe (terrain.vert), following the camera rig's morph and the patch
// frame TravelGlobe publishes each frame, and takes the globe's land shading in the globe's colours (terrain.frag).
'use client';

import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  Color, MathUtils, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3, type Texture,
} from 'three';
import type {TerrainControlValues} from '@/components/scene/controls/useSceneControls';
import {useRegion} from '@/components/scene/travel/useRegion';
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import {TRAVEL_CONFIG} from '@/config/scene/travel';
import {
  requestTerrainGradient,
  useTerrainAssets,
} from '@/lib/terrain/assets';
import {bakeTerrainLightingMap} from '@/lib/terrain/lightingBake';
import vertexShader from '@/shaders/terrain/terrain.vert';
import fragmentShader from '@/shaders/terrain/terrain.frag';
import {useCameraFrameState} from '../camera/CameraFrameState';
import '@/lib/scene/landShading';

type TerrainMeshProps = {
  settings: TerrainControlValues;
  /** The globe's colours, which the terrain takes on the way to Travel. */
  look: {baseColor: string; lineColor: string; landTint: number; shade: number};
};

export function TerrainMesh({settings, look}: TerrainMeshProps) {
  const surfaceMatRef = useRef<ShaderMaterial>(null);
  const cameraFrameState = useCameraFrameState();
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
    shadowStrength, shadowBias, edgeFade,
  } = settings;
  const [fadeStart, fadeEnd] = edgeFade;

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
    material.uniforms.edgeFade.value.set(fadeStart, fadeEnd);
  }, [
    elevation,
    seaLevel,
    baseColor,
    ridgeColor,
    lightColor,
    light2Color,
    fadeEnd,
    fadeStart,
    staticLightingMap,
  ]);
  const {baseColor: landBase, lineColor: landLine, landTint, shade: landShade} = look;
  useEffect(() => {
    const material = surfaceMatRef.current;
    if (!material) return;
    material.uniforms.uLandBase.value.set(landBase);
    material.uniforms.uLandLine.value.set(landLine);
    material.uniforms.uLandTint.value = landTint;
    material.uniforms.uLandShade.value = landShade;
  }, [landBase, landLine, landShade, landTint]);

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
    edgeFade:       { value: new Vector2(...TERRAIN_MESH_CONFIG.edgeFade) },
    uPlaneSize:     { value: TERRAIN_MESH_CONFIG.planeSize },
    uMorph:         { value: 0 },
    uGlobeCenter:   { value: new Vector3() },
    uGlobeRadius:   { value: 1 },
    uPatchAnchor:   { value: new Vector3(0, 1, 0) },
    uPatchEast:     { value: new Vector3(-1, 0, 0) },
    uPatchNorth:    { value: new Vector3(0, 0, 1) },
    uPatchPivot:    { value: new Vector2() },
    uPatchScale:    { value: 1 },
    uPatchRelief:   { value: 1 },
    uSeaUnits:      { value: 0 },
    uDatumY:        { value: 0 },
    uRegion:        { value: null as Texture | null },
    uHasRegion:     { value: 0 },
    uRegionUnits:   { value: 1 },
    uRegionTexel:   { value: new Vector2(1 / 1024, 1 / 1024) },
    uRegionMaxMetres: { value: 8000 },
    uRegionScale:   { value: 1 },
    uRegionSlope:   { value: TRAVEL_CONFIG.regionSlopeGain },
    uMetresPerUnit: { value: 1000 },
    uLandBase:      { value: new Color(TRAVEL_CONFIG.baseColor) },
    uLandLine:      { value: new Color(TRAVEL_CONFIG.lineColor) },
    uLandTint:      { value: TRAVEL_CONFIG.landTint },
    uLandShade:     { value: TRAVEL_CONFIG.shade },
    uRideBlend:     { value: 0 },
  }), [displacementMap, staticLightingMap]);

  // The regional tile the landscape's edge hands its heights to (the globe draws that ground); bound per frame, since
  // this mesh lives in the cache's own scene.
  const region = useRegion(TRAVEL_CONFIG.regionSrc, TRAVEL_CONFIG.regionMetaSrc);

  // After TravelGlobe (0.1) has placed the patch, before CachedTerrain (0.5) draws the cache.
  useFrame(() => {
    const material = surfaceMatRef.current;
    if (!material) return;
    const {travelMorph, travelPatch: patch} = cameraFrameState.current;
    const {
      uMorph, uGlobeCenter, uGlobeRadius, uPatchAnchor, uPatchEast, uPatchNorth, uPatchPivot, uPatchScale,
      uPatchRelief, uSeaUnits, uDatumY, uRegion, uHasRegion, uRegionMaxMetres, uRegionTexel, uRegionScale,
      uRegionUnits, uMetresPerUnit, uRideBlend,
    } = material.uniforms;
    uRegion.value = region?.texture ?? null;
    uHasRegion.value = region ? 1 : 0;
    if (region) {
      uRegionMaxMetres.value = region.meta.maxMetres;
      uRegionTexel.value.set(1 / region.meta.size, 1 / region.meta.size);
      uRegionScale.value = region.meta.maxMetres / TRAVEL_CONFIG.elevationTopMetres;
    }
    uMorph.value = travelMorph;
    // As the map lifts off, its pool of light gives way to the globe's land shading; its contour lines carry the
    // drawing meanwhile.
    uRideBlend.value = MathUtils.smoothstep(travelMorph, ...TRAVEL_CONFIG.landIn);
    if (travelMorph <= 0) return;
    uGlobeCenter.value.copy(patch.center);
    uGlobeRadius.value = patch.radius;
    uPatchAnchor.value.copy(patch.anchor);
    uPatchEast.value.copy(patch.east);
    uPatchNorth.value.copy(patch.north);
    // The plane lies rotated -90° about x: plane x is world x, plane y is world -z.
    const [planeX, , planeZ] = TERRAIN_MESH_CONFIG.position;
    uPatchPivot.value.set(patch.pivot.x - planeX, planeZ - patch.pivot.z);
    uPatchScale.value = patch.scale;
    uPatchRelief.value = patch.relief;
    uSeaUnits.value = patch.seaUnits;
    uDatumY.value = patch.datumY;
    uMetresPerUnit.value = patch.metresPerUnit;
    if (region) uRegionUnits.value = region.meta.km * 1000 / patch.metresPerUnit;
  }, 0.2);

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
