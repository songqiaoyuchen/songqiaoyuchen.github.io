// Travel trails: each trip's recorded tracks as one thin tube on the globe, in the signal colour, joined straight
// across any gap between recordings. Tubes bloom like the About path. Each vertex carries its ring's centre on the
// track (aCenter), so the shader lifts whole cross-sections by the relief under the track and narrows them from
// the overview's thickness to the trip's as a trip opens. The relief shapes a trail but never hides it: tubes draw
// without the depth test and hide only behind the globe's body, tested against the eye in globe space (uEye).
'use client';

import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {
  AdditiveBlending, BufferAttribute, CatmullRomCurve3, Color, Mesh, ShaderMaterial, TubeGeometry, Vector3,
  type Texture,
} from 'three';
import type {Trip} from '@/data/travel';
import {densifyTrack} from '@/lib/scene/travel';
import fragmentShader from '@/shaders/terrain/travelTrail.frag';
import vertexShader from '@/shaders/terrain/travelTrail.vert';
import type {Elevation} from './useElevation';

const QUIET_INTENSITY = 0.75;
const BRIGHT_INTENSITY = 1.15;
const RADIAL_SEGMENTS = 12;

type TrailSettings = {
  trailColor: string;
  /** Tube radius over all trips and with a trip open, shares of the globe radius. */
  trailRadius: number;
  tripTrailRadius: number;
  trailLift: number;
  trailStep: number;
};

type TravelTrailsProps = {
  trips: readonly Trip[];
  radius: number;
  settings: TrailSettings;
  /** The globe's relief this frame and how far it has taken the elevation summary: trails ride it. */
  elevation: Elevation | null;
  reliefRef: MutableRefObject<number>;
  focusRef: MutableRefObject<number>;
  /** Trip drawn bright: the selected one, else the one the globe rests on; -1 for none. */
  brightIndex: number;
  /** The globe's fade, 0 to 1, read every frame. */
  visibilityRef: MutableRefObject<number>;
  /** Whether the globe is drawn this frame (TravelGlobe): hidden, the tubes' uniforms are left as they stand. */
  shownRef: MutableRefObject<boolean>;
  onMeshes: (meshes: Mesh[]) => void;
};

type Tube = {
  trip: number;
  geometry: TubeGeometry;
  uniforms: {
    uColor: {value: Color};
    uVisibility: {value: number};
    uElevation: {value: Texture | null};
    uHasElevation: {value: number};
    uRelief: {value: number};
    uRadius: {value: number};
    uSummary: {value: Texture | null};
    uFocus: {value: number};
    uTripWidth: {value: number};
    uEye: {value: Vector3};
  };
};

export function TravelTrails({
  trips, radius, settings, elevation, reliefRef, focusRef, brightIndex, visibilityRef, shownRef, onMeshes,
}: TravelTrailsProps) {
  const {trailColor, trailRadius, tripTrailRadius, trailLift, trailStep} = settings;
  const meshesRef = useRef<Array<Mesh | null>>([]);
  const materialsRef = useRef<Array<ShaderMaterial | null>>([]);

  const tubes = useMemo(() => {
    const surface = radius * (1 + trailLift);
    const built: Tube[] = [];
    trips.forEach((trip, index) => {
      const track = (trip.segments ?? []).flat();
      const points = densifyTrack(track, trailStep).map((point) => point.multiplyScalar(surface));
      if (points.length < 2) return;
      const curve = new CatmullRomCurve3(points);
      const tubular = points.length * 2;
      const geometry = new TubeGeometry(curve, tubular, radius * trailRadius, RADIAL_SEGMENTS);
      // TubeGeometry builds ring by ring at getPointAt(i / tubular), radial + 1 vertices each.
      const ring = RADIAL_SEGMENTS + 1;
      const centers = new Float32Array((tubular + 1) * ring * 3);
      for (let i = 0; i <= tubular; i++) {
        const center = curve.getPointAt(i / tubular);
        for (let j = 0; j < ring; j++) center.toArray(centers, (i * ring + j) * 3);
      }
      geometry.setAttribute('aCenter', new BufferAttribute(centers, 3));
      built.push({
        trip: index,
        geometry,
        uniforms: {
          uColor: {value: new Color()},
          uVisibility: {value: 0},
          uElevation: {value: null},
          uHasElevation: {value: 0},
          uRelief: {value: 0},
          uRadius: {value: radius},
          uSummary: {value: null},
          uFocus: {value: 0},
          uTripWidth: {value: 1},
          uEye: {value: new Vector3()},
        },
      });
    });
    return built;
  }, [radius, trailLift, trailRadius, trailStep, trips]);
  useEffect(() => () => tubes.forEach(({geometry}) => geometry.dispose()), [tubes]);

  useEffect(() => {
    materialsRef.current.forEach((material, index) => {
      const tube = tubes[index];
      if (!material || !tube) return;
      material.uniforms.uColor.value.set(trailColor)
        .multiplyScalar(tube.trip === brightIndex ? BRIGHT_INTENSITY : QUIET_INTENSITY);
      material.uniforms.uTripWidth.value = tripTrailRadius / trailRadius;
    });
  }, [brightIndex, trailColor, trailRadius, tripTrailRadius, tubes]);

  useEffect(() => {
    materialsRef.current.forEach((material) => {
      if (!material) return;
      material.uniforms.uElevation.value = elevation?.texture ?? null;
      material.uniforms.uHasElevation.value = elevation ? 1 : 0;
      material.uniforms.uSummary.value = elevation?.summary ?? null;
    });
  }, [elevation, tubes]);

  useEffect(() => {
    onMeshes(meshesRef.current.slice(0, tubes.length).filter((mesh): mesh is Mesh => mesh !== null));
  }, [onMeshes, tubes]);

  useFrame(({camera}) => {
    if (!shownRef.current) return;
    const materials = materialsRef.current;
    for (let index = 0; index < materials.length; index++) {
      const material = materials[index];
      const mesh = meshesRef.current[index];
      if (!material || !mesh) continue;
      const {uVisibility, uRelief, uFocus, uEye} = material.uniforms;
      mesh.worldToLocal(uEye.value.copy(camera.position));
      uVisibility.value = visibilityRef.current;
      uRelief.value = reliefRef.current;
      uFocus.value = focusRef.current;
    }
  });

  return (
    <>
      {tubes.map((tube, index) => (
        <mesh
          frustumCulled={false}
          geometry={tube.geometry}
          key={`${tube.trip}-${index}`}
          ref={(mesh) => {
            meshesRef.current[index] = mesh;
          }}
          renderOrder={1}
        >
          <shaderMaterial
            blending={AdditiveBlending}
            depthTest={false}
            depthWrite={false}
            fragmentShader={fragmentShader}
            ref={(material) => {
              materialsRef.current[index] = material;
            }}
            transparent
            uniforms={tube.uniforms}
            vertexShader={vertexShader}
          />
        </mesh>
      ))}
    </>
  );
}
