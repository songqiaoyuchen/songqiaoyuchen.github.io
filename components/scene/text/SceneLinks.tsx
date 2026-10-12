// Scene links: the ART / PROJECTS / BLOG / ABOUT words on the homepage terrain, drawn in one glyph mesh.
// Handles layout switching (overview, focused, mobile), hover glitches, dissolves and the HTML hit targets.
'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  DoubleSide,
  ShaderMaterial,
  TextureLoader,
} from 'three';
import type { Group, Mesh } from 'three';
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type {
  ContourControlValues,
  TerrainControlValues,
} from '@/components/scene/controls/useSceneControls';
import {
  SCENE_LAYOUT_CONFIG,
  SCENE_LINK_EFFECT_CONFIG,
  SCENE_LINKS,
  type MobileSceneLinkSettings,
} from '@/config/scene';
import type {SectionId} from '@/data/sections';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {advanceTextTransition} from '@/lib/scene/textTransition';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {sampleHeight} from '@/lib/terrain/height';
import {configureSdfAtlas} from '@/lib/text/atlas';
import {
  buildSceneLinkGeometry,
  getSceneLinkHeight,
} from '@/lib/text/sceneLinkGeometry';
import {
  getSceneLinkLayoutMode,
  getSceneLinkLayouts,
  type SceneLinkLayoutMode,
} from '@/lib/text/sceneLinkLayout';
import {useCameraFrameState} from '../camera/CameraFrameState';
import {
  advanceLinkInteraction,
  advanceLinkLayout,
  createHitProjection,
  measureHitTarget,
} from './sceneLinkMotion';
import {SceneLinkHitTarget} from './SceneLinkHitTarget';
import {
  createSceneTextUniforms,
  sceneTextFragmentShader,
  sceneTextVertexShader,
  useSceneTextSettings,
} from './sceneTextMaterial';

type SceneLinksProps = {
  hidden?: boolean;
  activeId: SectionId | null;
  contourSettings: ContourControlValues;
  sceneLinkSettings: MobileSceneLinkSettings;
  onLinkClick: (id: SectionId) => void;
  terrainSettings: TerrainControlValues;
};

export const SceneLinks = forwardRef<Mesh, SceneLinksProps>(function SceneLinks(
  {
    hidden = false,
    activeId,
    contourSettings,
    sceneLinkSettings,
    onLinkClick,
    terrainSettings,
  },
  forwardedRef,
) {
  const atlas = useLoader(TextureLoader, '/textures/text/stream-atlas.png');
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const initialLayoutMode = getSceneLinkLayoutMode(activeId !== null, viewportWidth);
  const transitionKey = `${initialLayoutMode}:${activeId ?? 'home'}`;
  const materialRef = useRef<ShaderMaterial>(null);
  const hitTargetRefs = useRef<Array<Group | null>>([]);
  const hitButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hoveredIndex = useRef<number | null>(null);
  const hoverValues = useRef(new Float32Array(SCENE_LINKS.length));
  const glitchValues = useRef(new Float32Array(SCENE_LINKS.length));
  const layoutMode = useRef<SceneLinkLayoutMode>(initialLayoutMode);
  const transition = useRef({key: transitionKey,
    visibility: hidden || (initialLayoutMode === 'overview-mobile' && activeId !== null) ? 0 : 1});
  // Per-frame scratch, written in place rather than allocated each frame.
  const transitionRequest = useRef({key: transitionKey, visible: true, ready: true});
  const mode = useRef({isOverview: true, isMobileOverview: false});
  const layoutInitialized = useRef(false);
  const layoutDirty = useRef(true);
  const layoutAnimating = useRef(false);
  const interactionAnimating = useRef(false);
  const hitTargetsDirty = useRef(true);
  const cameraFrameState = useCameraFrameState();
  const projectedCameraRevision = useRef(-1);
  const isReducedMotion = useReducedMotion();
  const isFocused = activeId !== null;
  const desiredLayoutMode = getSceneLinkLayoutMode(isFocused, viewportWidth);
  const isMobileViewport = viewportWidth < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const activeIndex = activeId
    ? SCENE_LINKS.findIndex((link) => link.id === activeId)
    : -1;
  const {elevation, seaLevel} = terrainSettings;
  const {displacementMap, shellBase} = useTerrainAssets();
  // Re-parse on config edits so hot reloads rebuild the geometry.
  const linkConfigKey = JSON.stringify(SCENE_LINKS);
  const configuredLinks = useMemo(
    () => JSON.parse(linkConfigKey) as typeof SCENE_LINKS,
    [linkConfigKey],
  );
  const geometry = useMemo(
    () => buildSceneLinkGeometry(configuredLinks),
    [configuredLinks],
  );
  const layouts = useMemo(
    () => getSceneLinkLayouts(
      configuredLinks,
      viewportWidth,
      viewportHeight,
      shellBase,
      elevation,
      seaLevel,
      sceneLinkSettings,
      activeId,
    ),
    [
      configuredLinks,
      activeId,
      elevation,
      sceneLinkSettings,
      seaLevel,
      shellBase,
      viewportHeight,
      viewportWidth,
    ],
  );
  const hitProjection = useMemo(() => createHitProjection(), []);
  const terrain = useMemo(() => ({shellBase, elevation, seaLevel}), [elevation, seaLevel, shellBase]);
  const viewport = useMemo(
    () => ({width: viewportWidth, height: viewportHeight}), [viewportHeight, viewportWidth]);
  const compiledVertexShader = useMemo(
    () => sceneTextVertexShader(SCENE_LINKS.length),
    [],
  );
  const uniforms = useMemo(() => createSceneTextUniforms({
    atlas,
    heightmap: displacementMap,
    lift: SCENE_LINK_EFFECT_CONFIG.lift,
    hover: hoverValues.current,
    glitch: glitchValues.current,
    textTarget: new Float32Array(SCENE_LINKS.length),
    layoutOffsetX: new Float32Array(SCENE_LINKS.length),
    layoutOffsetZ: new Float32Array(SCENE_LINKS.length),
    verticalOffset: new Float32Array(SCENE_LINKS.map((link) => (
      link.overviewBottomOffset - link.focusedBottomOffset
    ))),
    focusedSpacingMultiplier: SCENE_LINK_EFFECT_CONFIG.focusedSpacingMultiplier,
    billboardTilt: 0,
    jiggleStrength: SCENE_LINK_EFFECT_CONFIG.jiggleStrength,
    sequencedLetterSwap: 1,
  }), [atlas, displacementMap]);

  useEffect(() => configureSdfAtlas(atlas), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useSceneTextSettings(materialRef, contourSettings, elevation, seaLevel);
  useEffect(() => {
    if (isReducedMotion) {
      glitchValues.current.fill(0);
    }
    interactionAnimating.current = true;
  }, [isReducedMotion]);
  useEffect(() => {
    layoutDirty.current = true;
    hitTargetsDirty.current = true;
  }, [elevation, layouts, seaLevel, viewportHeight, viewportWidth]);
  useEffect(() => {
    const material = materialRef.current;
    if (material) material.uniforms.uActiveStream.value = activeIndex;
  }, [activeIndex]);

  useFrame(({camera}, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const previousKey = transition.current.key;
    const ready = !cameraFrameState.current.transitioning;
    const visible = !hidden && (!isMobileViewport || activeId === null);
    if ((!visible || !ready) && hoveredIndex.current !== null) {
      hoveredIndex.current = null;
      glitchValues.current.fill(0);
      interactionAnimating.current = true;
    }
    // Layouts swap only while fully dissolved; the new layout reveals after the camera arrives.
    const request = transitionRequest.current;
    request.key = transitionKey;
    request.visible = visible;
    request.ready = ready;
    transition.current = advanceTextTransition(transition.current, request, delta, isReducedMotion,
      SCENE_LINK_EFFECT_CONFIG.dissolveInSpeed, SCENE_LINK_EFFECT_CONFIG.dissolveOutSpeed);
    const layoutSwitched = previousKey !== transition.current.key;
    if (layoutSwitched) layoutMode.current = desiredLayoutMode;

    const layoutModeNow = mode.current;
    layoutModeNow.isOverview = layoutMode.current === 'overview' || layoutMode.current === 'overview-mobile';
    layoutModeNow.isMobileOverview = layoutMode.current === 'overview-mobile';
    const targetLayout = layoutModeNow.isOverview
      ? layouts.overview
      : layouts.focused;
    const offsetX = material.uniforms.uLayoutOffsetX.value as Float32Array;
    const offsetZ = material.uniforms.uLayoutOffsetZ.value as Float32Array;
    const verticalOffsets = material.uniforms.uVerticalOffset.value as Float32Array;
    let hitTargetsMoved = layoutSwitched;

    material.uniforms.uTime.value += delta;
    const shouldUpdateLayout = (transition.current.key === transitionKey || !layoutInitialized.current) && (
      !layoutInitialized.current
      || layoutDirty.current
      || layoutAnimating.current
      || layoutSwitched
    );
    if (shouldUpdateLayout) {
      const layoutAlpha = isReducedMotion || !layoutInitialized.current || layoutSwitched
        ? 1
        : 1 - Math.exp(-SCENE_LINK_EFFECT_CONFIG.layoutDamping * delta);
      const layout = advanceLinkLayout(offsetX, offsetZ, verticalOffsets, targetLayout, layoutAlpha, layoutModeNow);
      hitTargetsMoved ||= layout.moved;

      layoutInitialized.current = true;
      layoutDirty.current = false;
      layoutAnimating.current = layout.unsettled;
      material.uniforms.uFocused.value = layoutModeNow.isOverview ? 0 : 1;
    }
    material.uniforms.uDissolve.value = transition.current.visibility;

    if (interactionAnimating.current) {
      interactionAnimating.current = advanceLinkInteraction(
        hoverValues.current, glitchValues.current, hoveredIndex.current, visible, delta);
    }

    const cameraRevision = cameraFrameState.current.revision;
    const cameraMoved = projectedCameraRevision.current !== cameraRevision;
    const disabled = !visible || !ready || transition.current.visibility < 1;
    for (const button of hitButtonRefs.current) {
      if (button && button.disabled !== disabled) button.disabled = disabled;
    }
    if (!hitTargetsDirty.current && !hitTargetsMoved && !cameraMoved) return;

    for (const link of SCENE_LINKS) {
      const hitTarget = hitTargetRefs.current[link.index];
      const hitButton = hitButtonRefs.current[link.index];
      if (!hitTarget || !hitButton) continue;
      const x = link.anchor[0] + offsetX[link.index];
      const z = link.anchor[1] + offsetZ[link.index];
      const hit = measureHitTarget(link, x, z, layoutModeNow, terrain, camera, hitProjection, viewport);
      hitTarget.position.set(x, hit.y, z);

      // Whole pixels: the invisible button need not follow sub-pixel camera noise, and the style then reads
      // back as written, so a repeat is skipped.
      const heightStyle = `${Math.round(hit.height)}px`;
      const widthStyle = `${Math.round(hit.width)}px`;
      if (hitButton.style.height !== heightStyle) hitButton.style.height = heightStyle;
      if (hitButton.style.width !== widthStyle) hitButton.style.width = widthStyle;
    }
    projectedCameraRevision.current = cameraRevision;
    hitTargetsDirty.current = false;
  }, 0.25);

  const setHoveredIndex = (index: number | null) => {
    hoveredIndex.current = index;
    if (index !== null && !isReducedMotion) glitchValues.current[index] = 1;
    interactionAnimating.current = true;
  };

  return (
    <>
      <mesh ref={forwardedRef} geometry={geometry} frustumCulled={false} renderOrder={4}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={compiledVertexShader}
          fragmentShader={sceneTextFragmentShader}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>

      {!hidden && SCENE_LINKS.map((link) => (
        <SceneLinkHitTarget
          key={link.id}
          link={link}
          position={[
            link.anchor[0],
            sampleHeight(shellBase, link.anchor[0], link.anchor[1], elevation, seaLevel)
              + (isMobileViewport ? 0 : link.overviewBottomOffset)
              + getSceneLinkHeight(link) * 0.5,
            link.anchor[1],
          ]}
          activeId={activeId}
          groupRef={(node) => {
            hitTargetRefs.current[link.index] = node;
            hitTargetsDirty.current = true;
          }}
          buttonRef={(node) => {
            hitButtonRefs.current[link.index] = node;
            hitTargetsDirty.current = true;
          }}
          onHover={setHoveredIndex}
          onLinkClick={onLinkClick}
        />
      ))}
    </>
  );
});
