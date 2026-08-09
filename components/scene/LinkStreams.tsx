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
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LINK_STREAM_EFFECT_CONFIG,
  LINK_STREAMS,
  type MobileLinkStreamSettings,
} from '@/config/navigation';
import {
  CONTOUR_CONFIG,
  SCENE_LAYOUT_CONFIG,
  TERRAIN_MATERIAL_CONFIG,
  TERRAIN_MESH_CONFIG,
} from '@/config/scene';
import type {
  ContourControlValues,
  TerrainControlValues,
} from '@/components/debug/useSceneControls';
import {useTerrainAssets} from '@/lib/terrain/assets';
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
import type {SectionId} from '@/config/navigation/linkStreams';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {useCameraFrameState} from './CameraFrameState';
type RayTransitionPhase = 'idle' | 'out' | 'in';

const ANIMATION_SETTLE_EPSILON = 0.0001;

type LinkStreamsProps = {
  activeId: SectionId | null;
  contourSettings: ContourControlValues;
  linkStreamSettings: MobileLinkStreamSettings;
  onStreamClick: (id: SectionId) => void;
  terrainSettings: TerrainControlValues;
};

export const LinkStreams = forwardRef<Mesh, LinkStreamsProps>(function LinkStreams(
  {
    activeId,
    contourSettings,
    linkStreamSettings,
    onStreamClick,
    terrainSettings,
  },
  forwardedRef,
) {
  const atlas = useLoader(TextureLoader, '/textures/text/stream-atlas.png');
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const initialLayoutMode = getLinkLayoutMode(activeId !== null, viewportWidth);
  const materialRef = useRef<ShaderMaterial>(null);
  const hitTargetRefs = useRef<Array<Group | null>>([]);
  const hitButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoverValues = useRef(new Float32Array(LINK_STREAMS.length));
  const glitchValues = useRef(new Float32Array(LINK_STREAMS.length));
  const layoutMode = useRef<LinkLayoutMode>(initialLayoutMode);
  const requestedLayoutMode = useRef<LinkLayoutMode>(initialLayoutMode);
  const transitionPhase = useRef<RayTransitionPhase>('idle');
  const dissolveVisibility = useRef(1);
  const layoutInitialized = useRef(false);
  const layoutDirty = useRef(true);
  const layoutAnimating = useRef(false);
  const interactionAnimating = useRef(false);
  const hitTargetsDirty = useRef(true);
  const cameraFrameState = useCameraFrameState();
  const projectedCameraRevision = useRef(-1);
  const isReducedMotion = useReducedMotion();
  const isFocused = activeId !== null;
  const desiredLayoutMode = getLinkLayoutMode(isFocused, viewportWidth);
  const isMobileViewport = viewportWidth < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const activeIndex = activeId
    ? LINK_STREAMS.findIndex((run) => run.id === activeId)
    : -1;
  const {elevation, seaLevel} = terrainSettings;
  const {displacementMap, shellBase} = useTerrainAssets();
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
      linkStreamSettings,
      activeId,
    ),
    [
      configuredStreams,
      activeId,
      elevation,
      linkStreamSettings,
      seaLevel,
      shellBase,
      viewportHeight,
      viewportWidth,
    ],
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
    uHover: { value: hoverValues.current },
    uGlitch: { value: glitchValues.current },
    uTextTarget: { value: new Float32Array(LINK_STREAMS.length) },
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
    uJiggleStrength: { value: LINK_STREAM_EFFECT_CONFIG.jiggleStrength },
    uSequencedLetterSwap: { value: 1 },
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
    if (isReducedMotion) {
      glitchValues.current.fill(0);
    } else if (hoveredIndex !== null) {
      glitchValues.current[hoveredIndex] = 1;
    }
    interactionAnimating.current = true;
  }, [hoveredIndex, isReducedMotion]);
  useEffect(() => {
    layoutDirty.current = true;
    hitTargetsDirty.current = true;
  }, [elevation, layouts, seaLevel, viewportHeight, viewportWidth]);
  useEffect(() => {
    if (desiredLayoutMode === requestedLayoutMode.current) return;
    requestedLayoutMode.current = desiredLayoutMode;
    transitionPhase.current = isReducedMotion ? 'idle' : 'out';
    if (isReducedMotion) layoutDirty.current = true;
  }, [desiredLayoutMode, isReducedMotion]);
  useEffect(() => {
    const material = materialRef.current;
    if (material) material.uniforms.uActiveStream.value = activeIndex;
  }, [activeIndex]);

  useFrame(({camera}, delta) => {
    const material = materialRef.current;
    if (!material) return;
    let layoutSwitched = false;

    if (isMobileViewport) {
      layoutSwitched = layoutMode.current !== 'overview-mobile';
      layoutMode.current = 'overview-mobile';
      const visibilityTarget = activeId === null ? 1 : 0;
      if (isReducedMotion) {
        dissolveVisibility.current = visibilityTarget;
      } else if (visibilityTarget < dissolveVisibility.current) {
        dissolveVisibility.current = Math.max(
          visibilityTarget,
          dissolveVisibility.current
            - delta * LINK_STREAM_EFFECT_CONFIG.dissolveOutSpeed,
        );
      } else if (visibilityTarget > dissolveVisibility.current) {
        dissolveVisibility.current = Math.min(
          visibilityTarget,
          dissolveVisibility.current
            + delta * LINK_STREAM_EFFECT_CONFIG.dissolveInSpeed,
        );
      }
      transitionPhase.current = 'idle';
    } else if (isReducedMotion) {
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

    const isOverviewLayout = layoutMode.current === 'overview'
      || layoutMode.current === 'overview-mobile';
    const isMobileOverviewLayout = layoutMode.current === 'overview-mobile';
    const targetLayout = isOverviewLayout
      ? layouts.overview
      : layouts.focused;
    const offsetX = material.uniforms.uLayoutOffsetX.value as Float32Array;
    const offsetZ = material.uniforms.uLayoutOffsetZ.value as Float32Array;
    const verticalOffsets = material.uniforms.uVerticalOffset.value as Float32Array;
    let hitTargetsMoved = layoutSwitched;

    material.uniforms.uTime.value += delta;
    const shouldUpdateLayout = (
      !layoutInitialized.current
      || layoutDirty.current
      || layoutAnimating.current
      || layoutSwitched
    );
    if (shouldUpdateLayout) {
      const layoutAlpha = isReducedMotion || !layoutInitialized.current || layoutSwitched
        ? 1
        : 1 - Math.exp(-LINK_STREAM_EFFECT_CONFIG.layoutDamping * delta);
      let hasUnsettledLayout = false;

      for (const run of LINK_STREAMS) {
        const target = targetLayout?.[run.index] ?? run.anchor;
        const targetOffsetX = target[0] - run.anchor[0];
        const targetOffsetZ = target[1] - run.anchor[1];
        const previousOffsetX = offsetX[run.index];
        const previousOffsetZ = offsetZ[run.index];
        const nextOffsetX = previousOffsetX
          + (targetOffsetX - previousOffsetX) * layoutAlpha;
        const nextOffsetZ = previousOffsetZ
          + (targetOffsetZ - previousOffsetZ) * layoutAlpha;
        const xSettled = Math.abs(targetOffsetX - nextOffsetX) < ANIMATION_SETTLE_EPSILON;
        const zSettled = Math.abs(targetOffsetZ - nextOffsetZ) < ANIMATION_SETTLE_EPSILON;
        offsetX[run.index] = xSettled ? targetOffsetX : nextOffsetX;
        offsetZ[run.index] = zSettled ? targetOffsetZ : nextOffsetZ;
        hasUnsettledLayout ||= !xSettled || !zSettled;
        hitTargetsMoved ||= (
          previousOffsetX !== offsetX[run.index]
          || previousOffsetZ !== offsetZ[run.index]
        );
        verticalOffsets[run.index] = isMobileOverviewLayout
          ? -run.focusedBottomOffset
          : isOverviewLayout
            ? run.overviewBottomOffset - run.focusedBottomOffset
            : 0;
      }

      layoutInitialized.current = true;
      layoutDirty.current = false;
      layoutAnimating.current = hasUnsettledLayout;
      material.uniforms.uFocused.value = isOverviewLayout ? 0 : 1;
    }
    material.uniforms.uDissolve.value = dissolveVisibility.current;

    if (interactionAnimating.current) {
      const hoverAlpha = Math.min(1, delta * LINK_STREAM_EFFECT_CONFIG.hoverDamping);
      let hasUnsettledInteraction = false;

      for (let index = 0; index < LINK_STREAMS.length; index++) {
        const hoverTarget = hoveredIndex === index ? 1 : 0;
        const nextHover = hoverValues.current[index]
          + (hoverTarget - hoverValues.current[index]) * hoverAlpha;
        const hoverSettled = Math.abs(hoverTarget - nextHover) < ANIMATION_SETTLE_EPSILON;
        hoverValues.current[index] = hoverSettled ? hoverTarget : nextHover;

        const nextGlitch = Math.max(
          0,
          glitchValues.current[index]
            - delta / LINK_STREAM_EFFECT_CONFIG.letterSwapDuration,
        );
        const glitchSettled = nextGlitch === 0;
        glitchValues.current[index] = glitchSettled ? 0 : nextGlitch;
        hasUnsettledInteraction ||= !hoverSettled || !glitchSettled;
      }

      interactionAnimating.current = hasUnsettledInteraction;
    }

    const cameraRevision = cameraFrameState.current.revision;
    const cameraMoved = projectedCameraRevision.current !== cameraRevision;
    if (!hitTargetsDirty.current && !hitTargetsMoved && !cameraMoved) return;

    for (const run of LINK_STREAMS) {
      const hitTarget = hitTargetRefs.current[run.index];
      const hitButton = hitButtonRefs.current[run.index];
      if (!hitTarget || !hitButton) continue;
      const x = run.anchor[0] + offsetX[run.index];
      const z = run.anchor[1] + offsetZ[run.index];
      const streamHeight = getLinkStreamHeight(run);
      const y =
        sampleHeight(shellBase, x, z, elevation, seaLevel) +
        (isMobileOverviewLayout
          ? 0
          : isOverviewLayout
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
      const heightStyle = `${hitHeight}px`;
      const widthStyle = `${hitWidth}px`;
      if (hitButton.style.height !== heightStyle) hitButton.style.height = heightStyle;
      if (hitButton.style.width !== widthStyle) hitButton.style.width = widthStyle;
    }
    projectedCameraRevision.current = cameraRevision;
    hitTargetsDirty.current = false;
  }, 0.25);

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
            + (isMobileViewport ? 0 : run.overviewBottomOffset)
            + getLinkStreamHeight(run) * 0.5,
          run.anchor[1],
        ];
        return (
          <group
            key={run.id}
            ref={(node) => {
              hitTargetRefs.current[run.index] = node;
              hitTargetsDirty.current = true;
            }}
            position={position}
          >
            <Html center zIndexRange={[30, 10]}>
              <button
                ref={(node) => {
                  hitButtonRefs.current[run.index] = node;
                  hitTargetsDirty.current = true;
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
                onFocus={() => setHoveredIndex(run.index)}
                onBlur={() => setHoveredIndex(null)}
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
