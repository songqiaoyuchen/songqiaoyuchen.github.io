// The navigation frame around the resting globe: tilted orbit rings drawn as arcs with gaps, each arc brightening
// along its length like a sweep, a fainter inner track and tick marks (every sixth longer). They turn about their
// own fixed axes with the globe's turn (TravelGlobe's signed spin factor: faster with a faster turn, reversing with
// it), in the line colour, faint so they frame without competing; only the arcs' heads reach the bloom pass.
'use client';

import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, MathUtils} from 'three';
import {useReducedMotion} from '@/hooks/useReducedMotion';

const SEGMENTS_PER_DEGREE = 0.75;
// Brightness along an arc, tail to head, of the ticks and of the inner track.
const ARC_TAIL = 0.05;
const TICK_BRIGHTNESS = 0.45;
const TRACK_BRIGHTNESS = 0.2;
const TRACK_RADIUS = 0.975;

export type RingSpec = {
  /** Share of the globe's radius. */
  radius: number;
  /** The ring as this many arcs... */
  arcs: number;
  /** ...with this gap between them, degrees. */
  gap: number;
  ticks: number;
  /** A fainter continuous track just inside the ring. */
  double: boolean;
  /** Turn about the ring's own axis, degrees per second. */
  spin: number;
};

/** Line segments (pairs of points) and a brightness per point for one ring. */
function ringGeometry(radius: number, ring: RingSpec) {
  const positions: number[] = [];
  const brightness: number[] = [];
  const point = (angle: number, r: number, level: number) => {
    positions.push(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    brightness.push(level);
  };
  const arcSpan = 360 / ring.arcs - ring.gap;
  for (let arc = 0; arc < ring.arcs; arc++) {
    const from = arc * 360 / ring.arcs;
    const steps = Math.max(8, Math.round(arcSpan * SEGMENTS_PER_DEGREE));
    for (let step = 0; step < steps; step++) {
      const a = MathUtils.degToRad(from + arcSpan * step / steps);
      const b = MathUtils.degToRad(from + arcSpan * (step + 1) / steps);
      point(a, radius, MathUtils.lerp(ARC_TAIL, 1, step / steps));
      point(b, radius, MathUtils.lerp(ARC_TAIL, 1, (step + 1) / steps));
    }
  }
  for (let index = 0; index < ring.ticks; index++) {
    const angle = MathUtils.degToRad(index / ring.ticks * 360);
    const length = radius * (index % 6 === 0 ? 0.028 : 0.01);
    point(angle, radius, TICK_BRIGHTNESS);
    point(angle, radius + length, TICK_BRIGHTNESS);
  }
  if (ring.double) {
    const steps = Math.round(360 * SEGMENTS_PER_DEGREE);
    for (let step = 0; step < steps; step++) {
      point(MathUtils.degToRad(360 * step / steps), radius * TRACK_RADIUS, TRACK_BRIGHTNESS);
      point(MathUtils.degToRad(360 * (step + 1) / steps), radius * TRACK_RADIUS, TRACK_BRIGHTNESS);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(brightness.flatMap((level) => [level, level, level]), 3));
  return geometry;
}

type TravelRingsProps = {
  rings: readonly RingSpec[];
  /** Per ring, its axis's tilt about x and z, degrees. */
  tilts: readonly (readonly [number, number])[];
  radius: number;
  color: string;
  intensity: number;
  /** How far the rings have come in, 0 to 1, read every frame. */
  visibilityRef: MutableRefObject<number>;
  /** Multiple of the rings' own spin this frame, read every frame (1 at rest, more while the globe turns). */
  spinRef: MutableRefObject<number>;
  /** Whether the globe is drawn this frame (TravelGlobe): hidden, the rings neither fade nor turn. */
  shownRef: MutableRefObject<boolean>;
  onLines: (lines: LineSegments[]) => void;
};

export function TravelRings(
  {rings, tilts, radius, color, intensity, visibilityRef, spinRef, shownRef, onLines}: TravelRingsProps,
) {
  const linesRef = useRef<Array<LineSegments | null>>([]);
  const materialsRef = useRef<Array<LineBasicMaterial | null>>([]);
  const reducedMotion = useReducedMotion();

  const geometries = useMemo(() => rings.map((ring) => ringGeometry(radius * ring.radius, ring)), [radius, rings]);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);

  useEffect(() => {
    materialsRef.current.forEach((material) => material?.color.set(color));
  }, [color, geometries]);
  useEffect(() => {
    onLines(linesRef.current.slice(0, rings.length).filter((line): line is LineSegments => line !== null));
  }, [geometries, onLines, rings.length]);

  useFrame((_, delta) => {
    if (!shownRef.current) return;
    rings.forEach((ring, index) => {
      const line = linesRef.current[index];
      const material = materialsRef.current[index];
      if (!line || !material) return;
      material.opacity = intensity * visibilityRef.current;
      line.visible = material.opacity > 0.002;
      if (!reducedMotion) line.rotation.y += MathUtils.degToRad(ring.spin) * spinRef.current * Math.min(delta, 1 / 30);
    });
  });

  return (
    <>
      {rings.map((_, index) => {
        const [x, z] = tilts[index] ?? [0, 0];
        // The tilt sits on a parent, so retuning it keeps the ring's spin where it is.
        return (
          <group key={index} rotation={[MathUtils.degToRad(x), 0, MathUtils.degToRad(z)]}>
            <lineSegments
              frustumCulled={false}
              geometry={geometries[index]}
              ref={(line) => { linesRef.current[index] = line; }}
              renderOrder={1}
              visible={false}
            >
              <lineBasicMaterial
                depthWrite={false}
                ref={(material) => { materialsRef.current[index] = material; }}
                transparent
                vertexColors
              />
            </lineSegments>
          </group>
        );
      })}
    </>
  );
}
