'use client';

import { Html } from '@react-three/drei';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  TextureLoader,
  Vector4,
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

export type LinkStreamId = Exclude<HomeSection, 'travel'>;

type RayLayout = {
  overview: [number, number];
  focusedTablet: [number, number];
  focusedDesktop: [number, number];
};

export const RAY_LAYOUTS: Record<LinkStreamId, RayLayout> = {
  projects: {
    overview: [7.05, 4.05],
    focusedTablet: [0.85, 3.45],
    focusedDesktop: [-0.4, 3.45],
  },
  art: {
    overview: [8.0, 1.53],
    focusedTablet: [0.15, 2.05],
    focusedDesktop: [-1.4, 2.05],
  },
  blog: {
    overview: [-0.1, 0.6],
    focusedTablet: [-0.1, 0.55],
    focusedDesktop: [-2.1, 0.55],
  },
  about: {
    overview: [-1.0, -0.63],
    focusedTablet: [-0.35, -0.95],
    focusedDesktop: [-2.65, -0.95],
  },
};

type RayLayoutMode = 'overview' | 'focused-mobile' | 'focused';
type RayTransitionPhase = 'idle' | 'out' | 'in';

function getDesiredLayoutMode(isFocused: boolean, viewportWidth: number): RayLayoutMode {
  if (!isFocused) return 'overview';
  if (viewportWidth < 768) return 'focused-mobile';
  return 'focused';
}

function getLayoutCoordinate(
  id: LinkStreamId,
  mode: RayLayoutMode,
  viewportWidth: number,
  coordinate: 0 | 1,
) {
  if (mode !== 'focused') return RAY_LAYOUTS[id].overview[coordinate];

  const responsiveMix = Math.min(1, Math.max(0, (viewportWidth - 768) / 512));
  const tabletCoordinate = RAY_LAYOUTS[id].focusedTablet[coordinate];
  const desktopCoordinate = RAY_LAYOUTS[id].focusedDesktop[coordinate];
  return tabletCoordinate + (desktopCoordinate - tabletCoordinate) * responsiveMix;
}

type LinkStream = LinkStreamRun & {
  id: LinkStreamId;
};

type LinkStreamsProps = {
  activeSection: HomeSection | null;
  onLinkClick: (id: LinkStreamId) => void;
};

const LINK_STREAMS: LinkStream[] = [
  { id: 'projects', text: 'PROJECTS',
    navRange: [0, 8], anchor: RAY_LAYOUTS.projects.overview,
    size: 0.45, spacing: 0.08, bottomOffset: 0.6, 
    linkId: 0, intensity: 1.18, seed: 2.1 },
  { id: 'art', text: 'ART',
    navRange: [0, 3], anchor: RAY_LAYOUTS.art.overview,
    size: 0.43, spacing: 0.08, bottomOffset: 1.7, 
    linkId: 1, intensity: 1.12, seed: 7.4 },
  { id: 'blog', text: 'BLOG',
    navRange: [0, 4], anchor: RAY_LAYOUTS.blog.overview,
    size: 0.45, spacing: 0.08, bottomOffset: 2.32, 
    linkId: 2, intensity: 1.16, seed: 12.7 },
  { id: 'about', text: 'ABOUT',
    navRange: [0, 5], anchor: RAY_LAYOUTS.about.overview,
    size: 0.43, spacing: 0.08, bottomOffset: 1.38, 
    linkId: 3, intensity: 1.1, seed: 18.3 },
];

export const LinkStreams = forwardRef<Mesh, LinkStreamsProps>(function LinkStreams(
  { activeSection, onLinkClick },
  forwardedRef,
) {
  const exr = useLoader(EXRLoader, '/textures/terrain/heightmap.exr');
  const atlas = useLoader(TextureLoader, '/textures/text/stream-atlas.png');
  const materialRef = useRef<ShaderMaterial>(null);
  const hitTargetRefs = useRef<Array<Group | null>>([]);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const hoverValues = useRef([0, 0, 0, 0]);
  const glitchValues = useRef([0, 0, 0, 0]);
  const layoutMode = useRef<RayLayoutMode>('overview');
  const requestedLayoutMode = useRef<RayLayoutMode>('overview');
  const transitionPhase = useRef<RayTransitionPhase>('idle');
  const dissolveVisibility = useRef(1);
  const viewportWidth = useThree((state) => state.size.width);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isFocused = activeSection !== null;
  const activeLinkId = activeSection
    ? LINK_STREAMS.find((run) => run.id === activeSection)?.linkId ?? -1
    : -1;
  const { elevation, seaLevel } = useTerrainControls();
  const { displacementMap, shellBase } = useMemo(
    () => getTerrainTextMaps(toHeightmapImage(exr.image)),
    [exr],
  );
  const geometry = useMemo(() => buildLinkStreamGeometry(LINK_STREAMS), []);
  const uniforms = useMemo(() => ({
    heightmap: { value: displacementMap },
    elevation: { value: TERRAIN_CONFIG.material.elevation },
    contrast: { value: TERRAIN_CONFIG.material.contrast },
    seaLevel: { value: TERRAIN_CONFIG.material.seaLevel },
    planeSize: { value: TERRAIN_CONFIG.mesh.planeSize },
    meshY: { value: TERRAIN_CONFIG.mesh.position[1] },
    uLift: { value: 0.075 },
    uTime: { value: 0 },
    uHover: { value: new Vector4() },
    uGlitch: { value: new Vector4() },
    uLayoutOffsetX: { value: new Vector4() },
    uLayoutOffsetZ: { value: new Vector4() },
    uLayoutProgress: { value: 0 },
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

    if (desiredLayoutMode !== requestedLayoutMode.current) {
      requestedLayoutMode.current = desiredLayoutMode;
      transitionPhase.current = 'out';
    }

    if (prefersReducedMotion) {
      layoutMode.current = requestedLayoutMode.current;
      transitionPhase.current = 'idle';
      dissolveVisibility.current = 1;
    } else if (transitionPhase.current === 'out') {
      dissolveVisibility.current = Math.max(0, dissolveVisibility.current - delta * 4.8);
      if (dissolveVisibility.current === 0) {
        layoutMode.current = requestedLayoutMode.current;
        transitionPhase.current = 'in';
      }
    } else if (transitionPhase.current === 'in') {
      dissolveVisibility.current = Math.min(1, dissolveVisibility.current + delta * 3.2);
      if (dissolveVisibility.current === 1) transitionPhase.current = 'idle';
    }

    const layoutUsesOffset = layoutMode.current === 'focused';
    const projectsX = getLayoutCoordinate('projects', layoutMode.current, viewportWidth, 0);
    const projectsZ = getLayoutCoordinate('projects', layoutMode.current, viewportWidth, 1);
    const artX = getLayoutCoordinate('art', layoutMode.current, viewportWidth, 0);
    const artZ = getLayoutCoordinate('art', layoutMode.current, viewportWidth, 1);
    const blogX = getLayoutCoordinate('blog', layoutMode.current, viewportWidth, 0);
    const blogZ = getLayoutCoordinate('blog', layoutMode.current, viewportWidth, 1);
    const aboutX = getLayoutCoordinate('about', layoutMode.current, viewportWidth, 0);
    const aboutZ = getLayoutCoordinate('about', layoutMode.current, viewportWidth, 1);

    material.uniforms.uTime.value += delta;
    material.uniforms.uLayoutOffsetX.value.set(
      projectsX - RAY_LAYOUTS.projects.overview[0],
      artX - RAY_LAYOUTS.art.overview[0],
      blogX - RAY_LAYOUTS.blog.overview[0],
      aboutX - RAY_LAYOUTS.about.overview[0],
    );
    material.uniforms.uLayoutOffsetZ.value.set(
      projectsZ - RAY_LAYOUTS.projects.overview[1],
      artZ - RAY_LAYOUTS.art.overview[1],
      blogZ - RAY_LAYOUTS.blog.overview[1],
      aboutZ - RAY_LAYOUTS.about.overview[1],
    );
    material.uniforms.uLayoutProgress.value = layoutUsesOffset ? 1 : 0;
    material.uniforms.uDissolve.value = dissolveVisibility.current;
    material.uniforms.uActiveLink.value = activeLinkId;
    material.uniforms.uFocused.value = layoutMode.current === 'overview' ? 0 : 1;

    for (let index = 0; index < 4; index++) {
      const target = hoveredLink === index ? 1 : 0;
      hoverValues.current[index] += (target - hoverValues.current[index]) * Math.min(1, delta * 9);
      glitchValues.current[index] *= Math.exp(-delta * 3.6);
    }
    material.uniforms.uHover.value.fromArray(hoverValues.current);
    material.uniforms.uGlitch.value.fromArray(glitchValues.current);

    for (const run of LINK_STREAMS) {
      const hitTarget = hitTargetRefs.current[run.linkId];
      if (!hitTarget) continue;
      const x = getLayoutCoordinate(run.id, layoutMode.current, viewportWidth, 0);
      const z = getLayoutCoordinate(run.id, layoutMode.current, viewportWidth, 1);
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
          vertexShader={vertexShader}
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
