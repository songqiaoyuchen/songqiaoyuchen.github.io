'use client';

import { Html } from '@react-three/drei';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  TextureLoader,
  Vector3,
} from 'three';
import type { Group, Mesh } from 'three';
import { EXRLoader } from 'three-stdlib';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {LINK_STREAM_EFFECT_CONFIG, LINK_STREAMS} from '@/config/navigation';
import {CONTOUR_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {
  ContourControlValues,
  TerrainControlValues,
} from '@/components/debug/useSceneControls';
import {bakeTerrainMaps, toHeightmapImage} from '@/lib/terrain/bake';
import {
  buildLinkStreamGeometry,
  getLinkStreamHeight,
} from '@/lib/text/linkStreamGeometry';
import {
  configureSdfAtlas,
} from '@/lib/text/atlas';
import {sampleHeight} from '@/lib/terrain/height';
import {
  getLinkLayoutMode,
  getLinkLayouts,
  type LinkLayoutMode,
} from '@/lib/text/linkStreamLayout';
import vertexShader from '@/shaders/linkStream.vert';
import fragmentShader from '@/shaders/linkStream.frag';
import type {SectionId} from '@/data/sections';
import {useReducedMotion} from '@/hooks/useReducedMotion';
type RayTransitionPhase = 'idle' | 'out' | 'in';

type LinkStreamsProps = {
  activeId: SectionId | null;
  contourSettings: ContourControlValues;
  onStreamClick: (id: SectionId) => void;
  terrainSettings: TerrainControlValues;
};

export const LinkStreams = forwardRef<Mesh, LinkStreamsProps>(function LinkStreams(
  {activeId, contourSettings, onStreamClick, terrainSettings},
  forwardedRef,
) {
  const exr = useLoader(EXRLoader, '/textures/terrain/heightmap.exr');
  const atlas = useLoader(TextureLoader, '/textures/text/stream-atlas.png');
  const materialRef = useRef<ShaderMaterial>(null);
  const hitTargetRefs = useRef<Array<Group | null>>([]);
  const hitButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoverValues = useRef(new Float32Array(LINK_STREAMS.length));
  const glitchValues = useRef(new Float32Array(LINK_STREAMS.length));
  const layoutMode = useRef<LinkLayoutMode>('overview');
  const requestedLayoutMode = useRef<LinkLayoutMode>('overview');
  const transitionPhase = useRef<RayTransitionPhase>('idle');
  const dissolveVisibility = useRef(1);
  const layoutInitialized = useRef(false);
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const isReducedMotion = useReducedMotion();
  const isFocused = activeId !== null;
  const activeIndex = activeId
    ? LINK_STREAMS.findIndex((run) => run.id === activeId)
    : -1;
  const {elevation, seaLevel} = terrainSettings;
  const { displacementMap, shellBase } = useMemo(
    () => bakeTerrainMaps(toHeightmapImage(exr.image)),
    [exr],
  );
  const streamConfigKey = JSON.stringify(LINK_STREAMS);
  const configuredStreams = useMemo(
    () => JSON.parse(streamConfigKey) as typeof LINK_STREAMS,
    [streamConfigKey],
  );
  const geometry = useMemo(
    () => buildLinkStreamGeometry(configuredStreams),
    [configuredStreams],
  );
  const layouts = useMemo(
    () => getLinkLayouts(
      configuredStreams,
      viewportWidth,
      viewportHeight,
      shellBase,
      elevation,
      seaLevel,
    ),
    [configuredStreams, elevation, seaLevel, shellBase, viewportHeight, viewportWidth],
  );
  const hitProjection = useMemo(() => ({
    bottom: new Vector3(),
    center: new Vector3(),
    left: new Vector3(),
    right: new Vector3(),
    rightAxis: new Vector3(),
    top: new Vector3(),
    toCamera: new Vector3(),
    up: new Vector3(0, 1, 0),
  }), []);
  const compiledVertexShader = useMemo(
    () => vertexShader.replace('__LINK_STREAM_COUNT__', String(LINK_STREAMS.length)),
    [],
  );
  const uniforms = useMemo(() => ({
    heightmap: { value: displacementMap },
    elevation: { value: TERRAIN_MATERIAL_CONFIG.elevation },
    contrast: { value: TERRAIN_MATERIAL_CONFIG.contrast },
    seaLevel: { value: TERRAIN_MATERIAL_CONFIG.seaLevel },
    planeSize: { value: TERRAIN_MESH_CONFIG.planeSize },
    meshY: { value: TERRAIN_MESH_CONFIG.position[1] },
    uLift: { value: LINK_STREAM_EFFECT_CONFIG.lift },
    uTime: { value: 0 },
    uHover: { value: new Float32Array(LINK_STREAMS.length) },
    uGlitch: { value: new Float32Array(LINK_STREAMS.length) },
    uLayoutOffsetX: { value: new Float32Array(LINK_STREAMS.length) },
    uLayoutOffsetZ: { value: new Float32Array(LINK_STREAMS.length) },
    uVerticalOffset: {
      value: new Float32Array(LINK_STREAMS.map((run) => (
        run.overviewBottomOffset - run.focusedBottomOffset
      ))),
    },
    uDissolve: { value: 1 },
    uActiveStream: { value: -1 },
    uFocused: { value: 0 },
    uFocusedSpacingMultiplier: {
      value: LINK_STREAM_EFFECT_CONFIG.focusedSpacingMultiplier,
    },
    uBillboardTilt: { value: 0 },
    uAtlas: { value: atlas },
    uDecorationColor: { value: new Color(CONTOUR_CONFIG.minorColor) },
    uStreamColor: { value: new Color(CONTOUR_CONFIG.majorColor) },
    uHotColor: { value: new Color(CONTOUR_CONFIG.pulseColor) },
  }), [atlas, displacementMap]);

  useEffect(() => configureSdfAtlas(atlas), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (!materialRef.current) return;
    const uniforms = materialRef.current.uniforms;
    uniforms.elevation.value = elevation;
    uniforms.seaLevel.value = seaLevel;
    uniforms.uDecorationColor.value.set(contourSettings.minorColor);
    uniforms.uStreamColor.value.set(contourSettings.majorColor);
    uniforms.uHotColor.value.set(contourSettings.pulseColor);
  }, [
    contourSettings.majorColor,
    contourSettings.minorColor,
    contourSettings.pulseColor,
    elevation,
    seaLevel,
  ]);
  useEffect(() => {
    if (hoveredIndex !== null) glitchValues.current[hoveredIndex] = 1;
  }, [hoveredIndex]);

  useFrame(({camera}, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const desiredLayoutMode = getLinkLayoutMode(isFocused, viewportWidth);
    let layoutSwitched = false;

    if (desiredLayoutMode !== requestedLayoutMode.current) {
      requestedLayoutMode.current = desiredLayoutMode;
      transitionPhase.current = 'out';
    }

    if (isReducedMotion) {
      layoutSwitched = layoutMode.current !== requestedLayoutMode.current;
      layoutMode.current = requestedLayoutMode.current;
      transitionPhase.current = 'idle';
      dissolveVisibility.current = 1;
    } else if (transitionPhase.current === 'out') {
      dissolveVisibility.current = Math.max(
        0,
        dissolveVisibility.current - delta * LINK_STREAM_EFFECT_CONFIG.dissolveOutSpeed,
      );
      if (dissolveVisibility.current === 0) {
        layoutMode.current = requestedLayoutMode.current;
        transitionPhase.current = 'in';
        layoutSwitched = true;
      }
    } else if (transitionPhase.current === 'in') {
      dissolveVisibility.current = Math.min(
        1,
        dissolveVisibility.current + delta * LINK_STREAM_EFFECT_CONFIG.dissolveInSpeed,
      );
      if (dissolveVisibility.current === 1) transitionPhase.current = 'idle';
    }

    const targetLayout = layoutMode.current === 'focused'
      ? layouts.focused
      : layoutMode.current === 'overview'
        ? layouts.overview
        : layouts.focusedMobile;
    const layoutAlpha = isReducedMotion || !layoutInitialized.current || layoutSwitched
      ? 1
      : 1 - Math.exp(-LINK_STREAM_EFFECT_CONFIG.layoutDamping * delta);
    const offsetX = material.uniforms.uLayoutOffsetX.value as Float32Array;
    const offsetZ = material.uniforms.uLayoutOffsetZ.value as Float32Array;
    const verticalOffsets = material.uniforms.uVerticalOffset.value as Float32Array;

    material.uniforms.uTime.value += delta;
    for (const run of LINK_STREAMS) {
      const target = targetLayout?.[run.index] ?? run.anchor;
      const targetOffsetX = target[0] - run.anchor[0];
      const targetOffsetZ = target[1] - run.anchor[1];
      offsetX[run.index] += (targetOffsetX - offsetX[run.index]) * layoutAlpha;
      offsetZ[run.index] += (targetOffsetZ - offsetZ[run.index]) * layoutAlpha;
      verticalOffsets[run.index] = layoutMode.current === 'overview'
        ? run.overviewBottomOffset - run.focusedBottomOffset
        : 0;
    }
    layoutInitialized.current = true;
    material.uniforms.uDissolve.value = dissolveVisibility.current;
    material.uniforms.uActiveStream.value = activeIndex;
    material.uniforms.uFocused.value = layoutMode.current === 'overview' ? 0 : 1;

    for (let index = 0; index < LINK_STREAMS.length; index++) {
      const target = hoveredIndex === index ? 1 : 0;
      hoverValues.current[index] += (
        (target - hoverValues.current[index])
        * Math.min(1, delta * LINK_STREAM_EFFECT_CONFIG.hoverDamping)
      );
      glitchValues.current[index] *= Math.exp(
        -delta * LINK_STREAM_EFFECT_CONFIG.glitchDecay,
      );
    }
    (material.uniforms.uHover.value as Float32Array).set(hoverValues.current);
    (material.uniforms.uGlitch.value as Float32Array).set(glitchValues.current);

    for (const run of LINK_STREAMS) {
      const hitTarget = hitTargetRefs.current[run.index];
      const hitButton = hitButtonRefs.current[run.index];
      if (!hitTarget || !hitButton) continue;
      const x = run.anchor[0] + offsetX[run.index];
      const z = run.anchor[1] + offsetZ[run.index];
      const streamHeight = getLinkStreamHeight(run);
      const y =
        sampleHeight(shellBase, x, z, elevation, seaLevel) +
        (layoutMode.current === 'overview'
          ? run.overviewBottomOffset
          : run.focusedBottomOffset) +
        streamHeight * 0.5;
      hitTarget.position.set(x, y, z);

      const halfWidth = run.size * 0.62 * 0.5;
      hitProjection.center.set(x, y, z);
      hitProjection.toCamera.subVectors(camera.position, hitProjection.center).normalize();
      hitProjection.rightAxis.crossVectors(hitProjection.up, hitProjection.toCamera).normalize();
      hitProjection.top.set(x, y + streamHeight * 0.5, z).project(camera);
      hitProjection.bottom.set(x, y - streamHeight * 0.5, z).project(camera);
      hitProjection.left.copy(hitProjection.center)
        .addScaledVector(hitProjection.rightAxis, -halfWidth)
        .project(camera);
      hitProjection.right.copy(hitProjection.center)
        .addScaledVector(hitProjection.rightAxis, halfWidth)
        .project(camera);

      const hitHeight = Math.max(
        44,
        Math.abs(hitProjection.top.y - hitProjection.bottom.y) * viewportHeight * 0.5 + 16,
      );
      const hitWidth = Math.max(
        44,
        Math.abs(hitProjection.right.x - hitProjection.left.x) * viewportWidth * 0.5 + 16,
      );
      hitButton.style.height = `${hitHeight}px`;
      hitButton.style.width = `${hitWidth}px`;
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
          sampleHeight(shellBase, run.anchor[0], run.anchor[1], elevation, seaLevel)
            + run.overviewBottomOffset
            + getLinkStreamHeight(run) * 0.5,
          run.anchor[1],
        ];
        return (
          <group
            key={run.id}
            ref={(node) => {
              hitTargetRefs.current[run.index] = node;
            }}
            position={position}
          >
            <Html center zIndexRange={[30, 10]}>
              <button
                ref={(node) => {
                  hitButtonRefs.current[run.index] = node;
                }}
                type="button"
                className="link-stream-hit block min-h-11 min-w-11 touch-manipulation
                  cursor-pointer rounded-sm border border-transparent bg-transparent
                  text-transparent outline-none transition-colors
                  focus-visible:border-line-hover focus-visible:bg-accent-dim
                  data-active:data-focused:focus-visible:border-transparent
                  data-active:data-focused:focus-visible:bg-transparent"
                aria-label={`Open ${run.text.toLowerCase()} preview`}
                aria-pressed={activeId === run.id}
                data-active={activeId === run.id || undefined}
                data-focused={isFocused || undefined}
                data-muted={(isFocused && activeId !== run.id) || undefined}
                onPointerEnter={() => setHoveredIndex(run.index)}
                onPointerLeave={() => setHoveredIndex(null)}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onStreamClick(run.id);
                }}
              />
            </Html>
          </group>
        );
      })}
    </>
  );
});
