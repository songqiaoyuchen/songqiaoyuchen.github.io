'use client';

import { Html } from '@react-three/drei';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  PerspectiveCamera,
  Ray,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three';
import type { Group, Mesh } from 'three';
import { EXRLoader } from 'three-stdlib';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { TERRAIN_CONFIG } from '@/config/terrain';
import { toHeightmapImage } from '@/lib/terrain/bake';
import {
  buildLinkStreamGeometry,
  linkStreamWorldHeight,
  type LinkStreamRun,
} from '@/lib/text/linkStreamGeometry';
import {
  configureSdfAtlas,
  getTerrainTextMaps,
  sampleTerrainHeight,
} from '@/lib/text/terrainTextShared';
import vertexShader from '@/shaders/linkStream.vert';
import fragmentShader from '@/shaders/linkStream.frag';
import type { HomeSection } from '@/data/homeFocusSections';
import { usePrefersReducedMotion } from '@/components/usePrefersReducedMotion';
import { useTerrainControls } from '../debug/useTerrainControls';
import {
  FOCUSED_CAMERA,
  getHomepageFov,
  OVERVIEW_CAMERA,
} from './CameraRig';

export type LinkStreamId = Exclude<HomeSection, 'travel'>;

type RayLayoutMode = 'overview' | 'focused-mobile' | 'focused';
type RayTransitionPhase = 'idle' | 'out' | 'in';

const MOBILE_LAYOUT_MAX_WIDTH = 768;
const MIN_SUPPORTED_LINKS = 4;
const MAX_SUPPORTED_LINKS = 6;
const SAFE_FRAME_INNER_X = 0.56;
const SAFE_FRAME_OUTER_X = 0.82;
const SAFE_FRAME_CENTER_Y = 0.145;
const FOCUSED_SAFE_FRAME_START_X = 0.04;
const FOCUSED_SAFE_FRAME_END_X = 0.88;
const FOCUSED_SAFE_FRAME_MIN_Y = -0.05;
const FOCUSED_DEPTH_SEARCH_STEPS = 12;
const TERRAIN_INTERSECTION_STEPS = 18;
const TERRAIN_INTERSECTION_DISTANCE = 50;
const LAYOUT_DAMPING = 7;

function getDesiredLayoutMode(isFocused: boolean, viewportWidth: number): RayLayoutMode {
  if (!isFocused) return 'overview';
  if (viewportWidth < MOBILE_LAYOUT_MAX_WIDTH) return 'focused-mobile';
  return 'focused';
}

type LinkStream = LinkStreamRun & {
  id: LinkStreamId;
};

type LinkStreamDefinition = Omit<LinkStream, 'linkId'>;

type LayoutPosition = [number, number];

type ProjectedLayoutPosition = {
  position: LayoutPosition;
  distance: number;
};

function makeSideSlots(side: -1 | 1, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const x = SAFE_FRAME_INNER_X + (SAFE_FRAME_OUTER_X - SAFE_FRAME_INNER_X) * progress;
    return new Vector2(side * x, SAFE_FRAME_CENTER_Y);
  });
}

function makeBalancedScreenSlots(count: number) {
  const leftCount = Math.ceil(count / 2);
  return [
    ...makeSideSlots(-1, leftCount),
    ...makeSideSlots(1, count - leftCount),
  ];
}

function makeFocusedScreenSlots(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const x = FOCUSED_SAFE_FRAME_START_X
      + (FOCUSED_SAFE_FRAME_END_X - FOCUSED_SAFE_FRAME_START_X) * progress;
    return new Vector2(x, SAFE_FRAME_CENTER_Y);
  });
}

function makeLayoutCamera(
  viewportWidth: number,
  viewportHeight: number,
  mode: Extract<RayLayoutMode, 'overview' | 'focused'>,
) {
  const pose = mode === 'focused' ? FOCUSED_CAMERA : OVERVIEW_CAMERA;
  const camera = new PerspectiveCamera(
    getHomepageFov(viewportWidth, viewportHeight),
    viewportWidth / Math.max(viewportHeight, 1),
    0.1,
    100,
  );
  camera.position.fromArray(pose.position);
  camera.lookAt(new Vector3().fromArray(pose.target));
  camera.updateMatrixWorld(true);
  return camera;
}

function projectSlotOntoTerrain(
  slot: Vector2,
  camera: PerspectiveCamera,
  run: LinkStream,
  shellBase: ReturnType<typeof getTerrainTextMaps>['shellBase'],
) {
  const rayEnd = new Vector3(slot.x, slot.y, 0.5).unproject(camera);
  const ray = new Ray(camera.position, rayEnd.sub(camera.position).normalize());
  const point = new Vector3();
  const centerOffset = run.bottomOffset + linkStreamWorldHeight(run) * 0.5;

  const distanceFromTerrain = (distance: number) => {
    ray.at(distance, point);
    return point.y - (
      sampleTerrainHeight(
        shellBase,
        point.x,
        point.z,
        TERRAIN_CONFIG.material.elevation,
        TERRAIN_CONFIG.material.seaLevel,
      ) + centerOffset
    );
  };

  let near = 0;
  let far = TERRAIN_INTERSECTION_DISTANCE;
  let nearDistance = distanceFromTerrain(near);
  const farDistance = distanceFromTerrain(far);

  if (nearDistance * farDistance <= 0) {
    for (let step = 0; step < TERRAIN_INTERSECTION_STEPS; step++) {
      const middle = (near + far) * 0.5;
      const middleDistance = distanceFromTerrain(middle);
      if (nearDistance * middleDistance <= 0) {
        far = middle;
      } else {
        near = middle;
        nearDistance = middleDistance;
      }
    }
    ray.at((near + far) * 0.5, point);
  } else {
    const directionY = Math.min(ray.direction.y, -0.0001);
    const fallbackY = TERRAIN_CONFIG.mesh.position[1] + centerOffset;
    ray.at((fallbackY - ray.origin.y) / directionY, point);
  }

  return {
    position: [point.x, point.z],
    distance: ray.origin.distanceTo(point),
  } as ProjectedLayoutPosition;
}

function getNearHalfDepth(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * 0.5)];
}

function normalizeFocusedDepth(
  runs: LinkStream[],
  slots: Vector2[],
  camera: PerspectiveCamera,
  shellBase: ReturnType<typeof getTerrainTextMaps>['shellBase'],
) {
  // Equal screen slots can hit very different terrain depths. Keep the near
  // half unchanged and pull only farther intersections toward that boundary.
  const projected = runs.map((run, index) => (
    projectSlotOntoTerrain(slots[index], camera, run, shellBase)
  ));
  const targetDepth = getNearHalfDepth(projected.map(({ distance }) => distance));

  return projected.map((initial, index) => {
    if (initial.distance <= targetDepth) return initial.position;

    let closest = initial;
    for (let step = 1; step <= FOCUSED_DEPTH_SEARCH_STEPS; step++) {
      const progress = step / FOCUSED_DEPTH_SEARCH_STEPS;
      const candidateSlot = slots[index].clone();
      candidateSlot.y += (FOCUSED_SAFE_FRAME_MIN_Y - candidateSlot.y) * progress;
      const candidate = projectSlotOntoTerrain(candidateSlot, camera, runs[index], shellBase);
      if (Math.abs(candidate.distance - targetDepth) < Math.abs(closest.distance - targetDepth)) {
        closest = candidate;
      }
    }
    return closest.position;
  });
}

function makeDesktopLayout(
  runs: LinkStream[],
  viewportWidth: number,
  viewportHeight: number,
  mode: Extract<RayLayoutMode, 'overview' | 'focused'>,
  shellBase: ReturnType<typeof getTerrainTextMaps>['shellBase'],
) {
  const camera = makeLayoutCamera(viewportWidth, viewportHeight, mode);
  const slots = mode === 'focused'
    ? makeFocusedScreenSlots(runs.length)
    : makeBalancedScreenSlots(runs.length);
  if (mode === 'focused') {
    return normalizeFocusedDepth(runs, slots, camera, shellBase);
  }
  return runs.map((run, index) => (
    projectSlotOntoTerrain(slots[index], camera, run, shellBase).position
  ));
}

type LinkStreamsProps = {
  activeSection: HomeSection | null;
  onLinkClick: (id: LinkStreamId) => void;
};

const LINK_STREAM_DEFINITIONS: LinkStreamDefinition[] = [
  { id: 'projects', text: 'PROJECTS',
    navRange: [0, 8], anchor: [7.05, 4.05],
    size: 0.45, spacing: 0.08, bottomOffset: 0.6, 
    intensity: 1.18, seed: 2.1 },
  { id: 'art', text: 'ART',
    navRange: [0, 3], anchor: [8.0, 1.53],
    size: 0.43, spacing: 0.08, bottomOffset: 1.7, 
    intensity: 1.12, seed: 7.4 },
  { id: 'blog', text: 'BLOG',
    navRange: [0, 4], anchor: [-0.1, 0.6],
    size: 0.45, spacing: 0.08, bottomOffset: 2.32, 
    intensity: 1.16, seed: 12.7 },
  { id: 'about', text: 'ABOUT',
    navRange: [0, 5], anchor: [-1.0, -0.63],
    size: 0.43, spacing: 0.08, bottomOffset: 1.38, 
    intensity: 1.1, seed: 18.3 },
];

const LINK_STREAMS: LinkStream[] = LINK_STREAM_DEFINITIONS.map((run, linkId) => ({
  ...run,
  linkId,
}));

if (LINK_STREAMS.length < MIN_SUPPORTED_LINKS || LINK_STREAMS.length > MAX_SUPPORTED_LINKS) {
  throw new Error(`Link stream layout supports ${MIN_SUPPORTED_LINKS}–${MAX_SUPPORTED_LINKS} links.`);
}

export const LinkStreams = forwardRef<Mesh, LinkStreamsProps>(function LinkStreams(
  { activeSection, onLinkClick },
  forwardedRef,
) {
  const exr = useLoader(EXRLoader, '/textures/terrain/heightmap.exr');
  const atlas = useLoader(TextureLoader, '/textures/text/stream-atlas.png');
  const materialRef = useRef<ShaderMaterial>(null);
  const hitTargetRefs = useRef<Array<Group | null>>([]);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const hoverValues = useRef(new Float32Array(LINK_STREAMS.length));
  const glitchValues = useRef(new Float32Array(LINK_STREAMS.length));
  const layoutMode = useRef<RayLayoutMode>('overview');
  const requestedLayoutMode = useRef<RayLayoutMode>('overview');
  const transitionPhase = useRef<RayTransitionPhase>('idle');
  const dissolveVisibility = useRef(1);
  const layoutInitialized = useRef(false);
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isFocused = activeSection !== null;
  const activeLinkId = activeSection
    ? LINK_STREAMS.findIndex((run) => run.id === activeSection)
    : -1;
  const { elevation, seaLevel } = useTerrainControls();
  const { displacementMap, shellBase } = useMemo(
    () => getTerrainTextMaps(toHeightmapImage(exr.image)),
    [exr],
  );
  const geometry = useMemo(() => buildLinkStreamGeometry(LINK_STREAMS), []);
  const desktopLayouts = useMemo(() => {
    if (viewportWidth < MOBILE_LAYOUT_MAX_WIDTH) return null;
    return {
      overview: makeDesktopLayout(
        LINK_STREAMS,
        viewportWidth,
        viewportHeight,
        'overview',
        shellBase,
      ),
      focused: makeDesktopLayout(
        LINK_STREAMS,
        viewportWidth,
        viewportHeight,
        'focused',
        shellBase,
      ),
    };
  }, [shellBase, viewportHeight, viewportWidth]);
  const compiledVertexShader = useMemo(
    () => vertexShader.replace('__LINK_STREAM_COUNT__', String(LINK_STREAMS.length)),
    [],
  );
  const uniforms = useMemo(() => ({
    heightmap: { value: displacementMap },
    elevation: { value: TERRAIN_CONFIG.material.elevation },
    contrast: { value: TERRAIN_CONFIG.material.contrast },
    seaLevel: { value: TERRAIN_CONFIG.material.seaLevel },
    planeSize: { value: TERRAIN_CONFIG.mesh.planeSize },
    meshY: { value: TERRAIN_CONFIG.mesh.position[1] },
    uLift: { value: 0.075 },
    uTime: { value: 0 },
    uHover: { value: new Float32Array(LINK_STREAMS.length) },
    uGlitch: { value: new Float32Array(LINK_STREAMS.length) },
    uLayoutOffsetX: { value: new Float32Array(LINK_STREAMS.length) },
    uLayoutOffsetZ: { value: new Float32Array(LINK_STREAMS.length) },
    uDissolve: { value: 1 },
    uActiveLink: { value: -1 },
    uFocused: { value: 0 },
    uAtlas: { value: atlas },
    uDecorationColor: { value: new Color(TERRAIN_CONFIG.contours.minorColor) },
    uLinkColor: { value: new Color(TERRAIN_CONFIG.contours.majorColor) },
    uHotColor: { value: new Color(TERRAIN_CONFIG.contours.pulseColor) },
  }), [atlas, displacementMap]);

  useEffect(() => configureSdfAtlas(atlas), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.elevation.value = elevation;
    materialRef.current.uniforms.seaLevel.value = seaLevel;
  }, [elevation, seaLevel]);
  useEffect(() => {
    if (hoveredLink !== null) glitchValues.current[hoveredLink] = 1;
  }, [hoveredLink]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const desiredLayoutMode = getDesiredLayoutMode(isFocused, viewportWidth);
    let layoutSwitched = false;

    if (desiredLayoutMode !== requestedLayoutMode.current) {
      requestedLayoutMode.current = desiredLayoutMode;
      transitionPhase.current = 'out';
    }

    if (prefersReducedMotion) {
      layoutSwitched = layoutMode.current !== requestedLayoutMode.current;
      layoutMode.current = requestedLayoutMode.current;
      transitionPhase.current = 'idle';
      dissolveVisibility.current = 1;
    } else if (transitionPhase.current === 'out') {
      dissolveVisibility.current = Math.max(0, dissolveVisibility.current - delta * 4.8);
      if (dissolveVisibility.current === 0) {
        layoutMode.current = requestedLayoutMode.current;
        transitionPhase.current = 'in';
        layoutSwitched = true;
      }
    } else if (transitionPhase.current === 'in') {
      dissolveVisibility.current = Math.min(1, dissolveVisibility.current + delta * 3.2);
      if (dissolveVisibility.current === 1) transitionPhase.current = 'idle';
    }

    const targetLayout = layoutMode.current === 'focused'
      ? desktopLayouts?.focused
      : layoutMode.current === 'overview'
        ? desktopLayouts?.overview
        : null;
    const layoutAlpha = prefersReducedMotion || !layoutInitialized.current || layoutSwitched
      ? 1
      : 1 - Math.exp(-LAYOUT_DAMPING * delta);
    const offsetX = material.uniforms.uLayoutOffsetX.value as Float32Array;
    const offsetZ = material.uniforms.uLayoutOffsetZ.value as Float32Array;

    material.uniforms.uTime.value += delta;
    for (const run of LINK_STREAMS) {
      const target = targetLayout?.[run.linkId] ?? run.anchor;
      const targetOffsetX = target[0] - run.anchor[0];
      const targetOffsetZ = target[1] - run.anchor[1];
      offsetX[run.linkId] += (targetOffsetX - offsetX[run.linkId]) * layoutAlpha;
      offsetZ[run.linkId] += (targetOffsetZ - offsetZ[run.linkId]) * layoutAlpha;
    }
    layoutInitialized.current = true;
    material.uniforms.uDissolve.value = dissolveVisibility.current;
    material.uniforms.uActiveLink.value = activeLinkId;
    material.uniforms.uFocused.value = layoutMode.current === 'overview' ? 0 : 1;

    for (let index = 0; index < LINK_STREAMS.length; index++) {
      const target = hoveredLink === index ? 1 : 0;
      hoverValues.current[index] += (target - hoverValues.current[index]) * Math.min(1, delta * 9);
      glitchValues.current[index] *= Math.exp(-delta * 3.6);
    }
    (material.uniforms.uHover.value as Float32Array).set(hoverValues.current);
    (material.uniforms.uGlitch.value as Float32Array).set(glitchValues.current);

    for (const run of LINK_STREAMS) {
      const hitTarget = hitTargetRefs.current[run.linkId];
      if (!hitTarget) continue;
      const x = run.anchor[0] + offsetX[run.linkId];
      const z = run.anchor[1] + offsetZ[run.linkId];
      const y =
        sampleTerrainHeight(shellBase, x, z, elevation, seaLevel) +
        run.bottomOffset +
        linkStreamWorldHeight(run) * 0.5;
      hitTarget.position.set(x, y, z);
    }
  });

  return (
    <>
      <mesh ref={forwardedRef} geometry={geometry} frustumCulled={false} renderOrder={4}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={compiledVertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>

      {LINK_STREAMS.map((run) => {
        const position: [number, number, number] = [
          run.anchor[0],
          sampleTerrainHeight(shellBase, run.anchor[0], run.anchor[1], elevation, seaLevel)
            + run.bottomOffset
            + linkStreamWorldHeight(run) * 0.5,
          run.anchor[1],
        ];
        return (
          <group
            key={run.id}
            ref={(node) => {
              hitTargetRefs.current[run.linkId] = node;
            }}
            position={position}
          >
            <Html center zIndexRange={[30, 10]}>
              <button
                type="button"
                className="stream-hit-target stream-hit-target--vertical cursor-pointer transition-colors focus-visible:border-line-hover focus-visible:bg-accent-dim"
                aria-label={`Open ${run.text.toLowerCase()} preview`}
                aria-pressed={activeSection === run.id}
                data-active={activeSection === run.id || undefined}
                data-focused={isFocused || undefined}
                data-muted={(isFocused && activeSection !== run.id) || undefined}
                onPointerEnter={() => setHoveredLink(run.linkId)}
                onPointerLeave={() => setHoveredLink(null)}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onLinkClick(run.id);
                }}
              />
            </Html>
          </group>
        );
      })}
    </>
  );
});
