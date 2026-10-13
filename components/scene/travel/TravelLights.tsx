// The globe's night lights: land as a field of light points, denser and brighter in lowlands and in loose
// clusters, like a night-side satellite view; sampled evenly over the sphere from the elevation map by the travel
// worker (lib/scene/travelWorker.ts, with the map in useElevation). They stand on the relief and ride the planet
// with the globe on the way in (the same group), appearing with altitude; the brightest carry into the bloom pass.
'use client';

import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, type DepthTexture,
} from 'three';
import {TRAVEL_CONFIG} from '@/config/scene/travel';
import fragmentShader from '@/shaders/terrain/travelPoints.frag';
import vertexShader from '@/shaders/terrain/travelPoints.vert';
import type {Elevation} from './useElevation';

type TravelLightsProps = {
  /** The map with the light points sampled from it (at the density Leva set). */
  elevation: Elevation | null;
  radius: number;
  /** Share of the radius above the surface the points stand. */
  lift: number;
  color: string;
  /** Point size in CSS pixels at full brightness. */
  size: number;
  /** Brightness gain. */
  intensity: number;
  /** The globe's relief this frame, as a share of its radius at the map's top. */
  reliefRef: MutableRefObject<number>;
  /** How far the globe has taken the elevation summary (a trip open), 0 to 1, read every frame. */
  focusRef: MutableRefObject<number>;
  /** How far the lights have come in, 0 to 1, read every frame. */
  visibilityRef: MutableRefObject<number>;
  /** Whether the globe is drawn this frame (TravelGlobe): hidden, the uniforms are left as they stand. */
  shownRef: MutableRefObject<boolean>;
  terrainDepthTexture: DepthTexture | null;
  onPoints: (points: Points | null) => void;
};

export function TravelLights({
  elevation, radius, lift, color, size, intensity, reliefRef, focusRef, visibilityRef, shownRef, terrainDepthTexture,
  onPoints,
}: TravelLightsProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const dpr = useThree((state) => state.viewport.dpr);

  const geometry = useMemo(() => {
    const geometry = new BufferGeometry();
    if (!elevation) return geometry;
    const {positions, heights, summaries, intensities, seeds} = elevation.lights;
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aHeight', new BufferAttribute(heights, 1));
    geometry.setAttribute('aSummary', new BufferAttribute(summaries, 1));
    geometry.setAttribute('aIntensity', new BufferAttribute(intensities, 1));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return geometry;
  }, [elevation]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Config defaults; the effects below keep these at the live settings.
  const uniforms = useMemo(() => ({
    uRadius: {value: TRAVEL_CONFIG.radius},
    uRelief: {value: 0},
    uFocus: {value: 0},
    uLift: {value: TRAVEL_CONFIG.trailLift},
    uSize: {value: TRAVEL_CONFIG.lightSize},
    uScale: {value: 1},
    uTime: {value: 0},
    uTwinkle: {value: 0},
    uColor: {value: new Color(TRAVEL_CONFIG.lineColor)},
    uVisibility: {value: 0},
    uIntensity: {value: TRAVEL_CONFIG.lightIntensity},
    uTint: {value: 0},
    uTerrainDepth: {value: null as DepthTexture | null},
    uUseTerrainDepth: {value: 0},
  }), []);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uRadius.value = radius;
    material.uniforms.uLift.value = lift;
    material.uniforms.uSize.value = size;
    material.uniforms.uIntensity.value = intensity;
    material.uniforms.uColor.value.set(color);
    material.uniforms.uScale.value = dpr;
    material.uniforms.uTerrainDepth.value = terrainDepthTexture;
    material.uniforms.uUseTerrainDepth.value = terrainDepthTexture ? 1 : 0;
  }, [color, dpr, intensity, lift, radius, size, terrainDepthTexture]);

  useFrame(() => {
    if (!shownRef.current) return;
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uRelief.value = reliefRef.current;
    material.uniforms.uFocus.value = focusRef.current;
    material.uniforms.uVisibility.value = visibilityRef.current;
  });

  return (
    <points frustumCulled={false} geometry={geometry} ref={onPoints} renderOrder={1}>
      <shaderMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        fragmentShader={fragmentShader}
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={vertexShader}
      />
    </points>
  );
}
