// Travel trails: each trip's recorded tracks as thin tubes on the globe, in the signal colour; the gap between
// two recordings of one trip is a dotted connector. Tubes bloom like the About path.
'use client';

import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {
  AdditiveBlending, CatmullRomCurve3, Color, Mesh, ShaderMaterial, TubeGeometry, type DepthTexture, type Texture,
} from 'three';
import type {Trip} from '@/data/travel';
import {densifyTrack, polylineLength, trackGaps} from '@/lib/scene/travel';
import fragmentShader from '@/shaders/terrain/travelTrail.frag';
import vertexShader from '@/shaders/terrain/travelTrail.vert';
import type {Elevation} from './useElevation';

const QUIET_INTENSITY = 0.75;
const BRIGHT_INTENSITY = 1.15;

type TrailSettings = {
  trailColor: string;
  trailRadius: number;
  trailLift: number;
  dashLength: number;
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
  terrainDepthTexture: DepthTexture | null;
  /** Trip drawn bright: the selected one, else the one the globe rests on; -1 for none. */
  brightIndex: number;
  /** The globe's fade, 0 to 1, read every frame. */
  visibilityRef: MutableRefObject<number>;
  onMeshes: (meshes: Mesh[]) => void;
};

type Tube = {
  trip: number;
  geometry: TubeGeometry;
  uniforms: {
    uColor: {value: Color};
    uVisibility: {value: number};
    uDashed: {value: number};
    uLength: {value: number};
    uDashLength: {value: number};
    uElevation: {value: Texture | null};
    uHasElevation: {value: number};
    uRelief: {value: number};
    uRadius: {value: number};
    uSummary: {value: Texture | null};
    uFocus: {value: number};
    uTerrainDepth: {value: DepthTexture | null};
    uUseTerrainDepth: {value: number};
  };
};

export function TravelTrails({
  trips, radius, settings, elevation, reliefRef, focusRef, terrainDepthTexture, brightIndex, visibilityRef, onMeshes,
}: TravelTrailsProps) {
  const {trailColor, trailRadius, trailLift, dashLength, trailStep} = settings;
  const meshesRef = useRef<Array<Mesh | null>>([]);
  const materialsRef = useRef<Array<ShaderMaterial | null>>([]);

  const tubes = useMemo(() => {
    const surface = radius * (1 + trailLift);
    const built: Tube[] = [];
    const tube = (track: Parameters<typeof densifyTrack>[0], trip: number, dashed: boolean) => {
      const points = densifyTrack(track, trailStep).map((point) => point.multiplyScalar(surface));
      if (points.length < 2) return;
      built.push({
        trip,
        geometry: new TubeGeometry(new CatmullRomCurve3(points), points.length * 2, radius * trailRadius, 12),
        uniforms: {
          uColor: {value: new Color()},
          uVisibility: {value: 0},
          uDashed: {value: dashed ? 1 : 0},
          uLength: {value: polylineLength(points)},
          uDashLength: {value: dashLength},
          uElevation: {value: null},
          uHasElevation: {value: 0},
          uRelief: {value: 0},
          uRadius: {value: radius},
          uSummary: {value: null},
          uFocus: {value: 0},
          uTerrainDepth: {value: null},
          uUseTerrainDepth: {value: 0},
        },
      });
    };
    trips.forEach((trip, index) => {
      const segments = trip.segments ?? [];
      segments.forEach((segment) => tube(segment, index, false));
      trackGaps(segments).forEach((gap) => tube(gap, index, true));
    });
    return built;
  }, [dashLength, radius, trailLift, trailRadius, trailStep, trips]);
  useEffect(() => () => tubes.forEach(({geometry}) => geometry.dispose()), [tubes]);

  useEffect(() => {
    materialsRef.current.forEach((material, index) => {
      const tube = tubes[index];
      if (!material || !tube) return;
      material.uniforms.uColor.value.set(trailColor)
        .multiplyScalar(tube.trip === brightIndex ? BRIGHT_INTENSITY : QUIET_INTENSITY);
    });
  }, [brightIndex, trailColor, tubes]);

  useEffect(() => {
    materialsRef.current.forEach((material) => {
      if (!material) return;
      material.uniforms.uElevation.value = elevation?.texture ?? null;
      material.uniforms.uHasElevation.value = elevation ? 1 : 0;
      material.uniforms.uSummary.value = elevation?.summary ?? null;
      material.uniforms.uTerrainDepth.value = terrainDepthTexture;
      material.uniforms.uUseTerrainDepth.value = terrainDepthTexture ? 1 : 0;
    });
  }, [elevation, terrainDepthTexture, tubes]);

  useEffect(() => {
    onMeshes(meshesRef.current.slice(0, tubes.length).filter((mesh): mesh is Mesh => mesh !== null));
  }, [onMeshes, tubes]);

  useFrame(() => {
    const materials = materialsRef.current;
    for (let index = 0; index < materials.length; index++) {
      const material = materials[index];
      if (!material) continue;
      const {uVisibility, uRelief, uFocus} = material.uniforms;
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
