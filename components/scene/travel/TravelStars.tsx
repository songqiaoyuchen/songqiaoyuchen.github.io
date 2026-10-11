// The sky behind the resting globe: a sparse field of stars on a far sphere about the globe's centre, varied in
// size and brightness with a slight warm-to-cool spread, a few bright enough to bloom, twinkling faintly. They
// appear with altitude on the way in and sit outside the globe's turning group; the whole field drifts slowly about
// a tilted axis, one object rotation a frame (held still for reduced motion).
'use client';

import {useFrame, useThree} from '@react-three/fiber';
import {useCallback, useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, Vector3} from 'three';
import {TRAVEL_CONFIG} from '@/config/scene/travel';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import fragmentShader from '@/shaders/terrain/travelPoints.frag';
import vertexShader from '@/shaders/terrain/travelPoints.vert';

const DRIFT_AXIS = new Vector3(...TRAVEL_CONFIG.starAxis).normalize();

function hash(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

type TravelStarsProps = {
  count: number;
  /** Distance from the globe's centre. */
  radius: number;
  /** Point size in CSS pixels at full brightness. */
  size: number;
  color: string;
  /** How far the sky has come in, 0 to 1, read every frame. */
  visibilityRef: MutableRefObject<number>;
  onPoints: (points: Points | null) => void;
};

export function TravelStars({count, radius, size, color, visibilityRef, onPoints}: TravelStarsProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const pointsRef = useRef<Points | null>(null);
  const drift = useRef(0);
  const dpr = useThree((state) => state.viewport.dpr);
  const reducedMotion = useReducedMotion();

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const heights: number[] = [];
    const intensities: number[] = [];
    const seeds: number[] = [];
    for (let index = 0; index < count; index++) {
      const y = hash(index, 1) * 2 - 1;
      const angle = hash(index, 2) * Math.PI * 2;
      const ring = Math.sqrt(1 - y * y);
      positions.push(ring * Math.cos(angle), y, ring * Math.sin(angle));
      heights.push(0);
      // Most stars faint, a few bright.
      intensities.push(0.4 + 0.6 * Math.pow(hash(index, 3), 3));
      seeds.push(hash(index, 4));
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aHeight', new Float32BufferAttribute(heights, 1));
    geometry.setAttribute('aIntensity', new Float32BufferAttribute(intensities, 1));
    geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
    return geometry;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Config defaults; the effect below keeps these at the live settings.
  const uniforms = useMemo(() => ({
    uRadius: {value: TRAVEL_CONFIG.starRadius},
    uRelief: {value: 0},
    uLift: {value: 0},
    uSize: {value: TRAVEL_CONFIG.starSize},
    uScale: {value: 1},
    uTime: {value: 0},
    uTwinkle: {value: 1},
    uColor: {value: new Color(TRAVEL_CONFIG.lineColor)},
    uVisibility: {value: 0},
    uTint: {value: 0.7},
    uTerrainDepth: {value: null},
    uUseTerrainDepth: {value: 0},
  }), []);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uRadius.value = radius;
    material.uniforms.uSize.value = size;
    material.uniforms.uColor.value.set(color);
    material.uniforms.uScale.value = dpr;
    material.uniforms.uTwinkle.value = reducedMotion ? 0 : 1;
  }, [color, dpr, radius, reducedMotion, size]);

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uVisibility.value = visibilityRef.current;
    const points = pointsRef.current;
    if (points && !reducedMotion && visibilityRef.current > 0) {
      // Clamp the step so a tab return doesn't jump the sky.
      drift.current = (drift.current + Math.min(delta, 0.1) * TRAVEL_CONFIG.starDrift) % (Math.PI * 2);
      points.quaternion.setFromAxisAngle(DRIFT_AXIS, drift.current);
    }
  });

  const handlePoints = useCallback((points: Points | null) => {
    pointsRef.current = points;
    onPoints(points);
  }, [onPoints]);

  return (
    <points frustumCulled={false} geometry={geometry} ref={handlePoints} renderOrder={-1}>
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
