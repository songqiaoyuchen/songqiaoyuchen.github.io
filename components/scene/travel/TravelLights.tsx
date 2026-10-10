// The globe's night lights: land as a field of light points, denser and brighter in lowlands and in loose
// clusters, like a night-side satellite view; sampled evenly over the sphere from the elevation map once it
// loads. They stand on the relief and ride the planet with the globe on the way in (the same group), appearing
// with altitude; the brightest carry into the bloom pass.
'use client';

import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {
  AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, type DepthTexture,
} from 'three';
import {TRAVEL_CONFIG} from '@/config/scene/travel';
import fragmentShader from '@/shaders/terrain/travelPoints.frag';
import vertexShader from '@/shaders/terrain/travelPoints.vert';
import type {Elevation} from './useElevation';

// Even samples over the sphere before the land and density tests, each nudged off the lattice by up to this share
// of the sample spacing so no rows show at the planet's scale.
const SAMPLES = 140000;
const JITTER = 0.9;
const SEA = 0.004;

function hash(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

type TravelLightsProps = {
  elevation: Elevation | null;
  radius: number;
  /** Share of the radius above the surface the points stand. */
  lift: number;
  color: string;
  /** Share of the candidate land points kept. */
  density: number;
  /** Point size in CSS pixels at full brightness. */
  size: number;
  /** The globe's relief this frame, as a share of its radius at the map's top. */
  reliefRef: MutableRefObject<number>;
  /** How far the lights have come in, 0 to 1, read every frame. */
  visibilityRef: MutableRefObject<number>;
  terrainDepthTexture: DepthTexture | null;
  onPoints: (points: Points | null) => void;
};

export function TravelLights({
  elevation, radius, lift, color, density, size, reliefRef, visibilityRef, terrainDepthTexture, onPoints,
}: TravelLightsProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const dpr = useThree((state) => state.viewport.dpr);

  const geometry = useMemo(() => {
    const geometry = new BufferGeometry();
    if (!elevation) return geometry;
    const positions: number[] = [];
    const heights: number[] = [];
    const intensities: number[] = [];
    const seeds: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const spacing = Math.sqrt(4 * Math.PI / SAMPLES);
    for (let index = 0; index < SAMPLES; index++) {
      const y0 = 1 - (index / (SAMPLES - 1)) * 2;
      const ring = Math.sqrt(1 - y0 * y0);
      const theta = golden * index;
      // Nudge along the local east and north, then back onto the sphere.
      const east = (hash(index, 0.37) - 0.5) * 2 * JITTER * spacing;
      const north = (hash(index, 0.91) - 0.5) * 2 * JITTER * spacing;
      let x = Math.cos(theta) * ring - Math.sin(theta) * east - y0 * Math.cos(theta) * north;
      let z = Math.sin(theta) * ring + Math.cos(theta) * east - y0 * Math.sin(theta) * north;
      let y = y0 + ring * north;
      const length = Math.hypot(x, y, z);
      x /= length; y /= length; z /= length;
      const lat = Math.asin(y) * 180 / Math.PI;
      const lon = Math.atan2(x, z) * 180 / Math.PI;
      if (lat < -60) continue;
      const height = elevation.heightAt([lon, lat]);
      if (height < SEA) continue;
      // Lowland is where people live; loose clusters stand in for cities until real data arrives.
      const lowland = Math.pow(1 - Math.min(height * 2.2, 1), 1.5);
      const cluster = 0.5 + 0.5 * Math.sin(lon * 0.21 + 1.3) * Math.sin(lat * 0.37 + 0.4)
        + 0.4 * Math.sin(lon * 0.9) * Math.cos(lat * 0.7);
      if (hash(lon * 3.1, lat * 2.7) > density * (0.65 + 1.3 * lowland * Math.max(cluster, 0.2))) continue;
      positions.push(x, y, z);
      heights.push(height);
      intensities.push(0.35 + 0.65 * Math.pow(hash(lat * 5.3, lon * 7.1), 1.8) * (0.4 + 0.6 * lowland));
      seeds.push(hash(lon * 1.7, lat * 9.3));
    }
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aHeight', new Float32BufferAttribute(heights, 1));
    geometry.setAttribute('aIntensity', new Float32BufferAttribute(intensities, 1));
    geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
    return geometry;
  }, [density, elevation]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Config defaults; the effects below keep these at the live settings.
  const uniforms = useMemo(() => ({
    uRadius: {value: TRAVEL_CONFIG.radius},
    uRelief: {value: 0},
    uLift: {value: TRAVEL_CONFIG.trailLift},
    uSize: {value: TRAVEL_CONFIG.lightSize},
    uScale: {value: 1},
    uTime: {value: 0},
    uTwinkle: {value: 0},
    uColor: {value: new Color(TRAVEL_CONFIG.lineColor)},
    uVisibility: {value: 0},
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
    material.uniforms.uColor.value.set(color);
    material.uniforms.uScale.value = dpr;
    material.uniforms.uTerrainDepth.value = terrainDepthTexture;
    material.uniforms.uUseTerrainDepth.value = terrainDepthTexture ? 1 : 0;
  }, [color, dpr, lift, radius, size, terrainDepthTexture]);

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uRelief.value = reliefRef.current;
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
