// The WebGL hero name ("SQYC", swapping to "NIRO" on hover, or for a moment on a mobile tap); on mobile it covers
// the HTML name's box, whose text Hero keeps for screen readers and the terrain fallback.
// Fades in after the preloader, blooms with the scene links and dissolves whenever a section opens.
'use client';

import {forwardRef, useEffect, useMemo, useRef, useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame, useLoader, useThree} from '@react-three/fiber';
import {
  AdditiveBlending,
  DoubleSide,
  MathUtils,
  ShaderMaterial,
  TextureLoader,
} from 'three';
import type {Mesh} from 'three';
import type {
  ContourControlValues,
  TerrainControlValues,
} from '@/components/scene/controls/useSceneControls';
import {HERO_SCENE_CONFIG} from '@/config/hero';
import {SCENE_LINK_EFFECT_CONFIG, SCENE_LINKS} from '@/config/scene';
import {HERO_CONTENT} from '@/data/hero';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {advanceTextVisibility} from '@/lib/scene/textTransition';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {sampleHeight} from '@/lib/terrain/height';
import {configureSdfAtlas} from '@/lib/text/atlas';
import {buildHorizontalTextGeometry} from '@/lib/text/sceneLinkGeometry';
import {
  getSceneLinkLayouts,
  projectOverviewSlotAtDistance,
  projectOverviewSlotAtScreenWidth,
} from '@/lib/text/sceneLinkLayout';
import {useCameraFrameState} from '../camera/CameraFrameState';
import {linksMedianDepth, measureHeroNameSlot} from './heroNameLayout';
import {SETTLE_EPSILON} from './sceneLinkMotion';
import {
  createSceneTextUniforms,
  sceneTextFragmentShader,
  sceneTextVertexShader,
  useSceneTextSettings,
} from './sceneTextMaterial';

const GLYPH_WIDTH = HERO_SCENE_CONFIG.size * HERO_SCENE_CONFIG.glyphWidthToHeightRatio;
const NAME_WORLD_WIDTH = (HERO_CONTENT.name.length - 1) * (GLYPH_WIDTH + HERO_SCENE_CONFIG.spacing) + GLYPH_WIDTH;

interface SceneHeroNameProps {
  contourSettings: ContourControlValues;
  isHidden: boolean;
  introStarted: boolean;
  terrainSettings: TerrainControlValues;
}

export const SceneHeroName = forwardRef<Mesh, SceneHeroNameProps>(function SceneHeroName(
  {contourSettings, isHidden, introStarted, terrainSettings},
  forwardedRef,
) {
  const atlas = useLoader(TextureLoader, '/textures/text/stream-atlas.png');
  const materialRef = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);
  const dissolve = useRef(0);
  // Mobile: the tap that showed the alternate name schedules its swap back.
  const swapBackTimer = useRef<number | null>(null);
  const cameraFrameState = useCameraFrameState();
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const isReducedMotion = useReducedMotion();
  const isDesktop = viewportWidth >= HERO_SCENE_CONFIG.desktopMinWidth;
  const [mobileSlot, setMobileSlot] = useState<ReturnType<typeof measureHeroNameSlot>>(null);
  const needsMobileSlot = useRef(true);
  const isPlaced = isDesktop || mobileSlot !== null;
  const {elevation, seaLevel} = terrainSettings;
  const {displacementMap, shellBase} = useTerrainAssets();
  const geometry = useMemo(() => buildHorizontalTextGeometry({
    alternateText: HERO_CONTENT.hoverName,
    anchor: [0, 0],
    bottomOffset: 0,
    glyphWidthToHeightRatio: HERO_SCENE_CONFIG.glyphWidthToHeightRatio,
    intensity: HERO_SCENE_CONFIG.intensity,
    seed: HERO_SCENE_CONFIG.seed,
    size: HERO_SCENE_CONFIG.size,
    spacing: HERO_SCENE_CONFIG.spacing,
    text: HERO_CONTENT.name,
  }), []);
  const centerOffset = HERO_SCENE_CONFIG.size * 0.5;
  const linkLayouts = useMemo(
    () => getSceneLinkLayouts(
      SCENE_LINKS,
      viewportWidth,
      viewportHeight,
      shellBase,
      elevation,
      seaLevel,
    ),
    [elevation, seaLevel, shellBase, viewportHeight, viewportWidth],
  );
  const referenceDepth = useMemo(
    () => linksMedianDepth(linkLayouts.overview, viewportWidth, {shellBase, elevation, seaLevel}),
    [elevation, linkLayouts.overview, seaLevel, shellBase, viewportWidth],
  );
  const scenePoint = useMemo(() => {
    if (isDesktop || !mobileSlot) {
      return projectOverviewSlotAtDistance(
        HERO_SCENE_CONFIG.screenPosition,
        viewportWidth,
        viewportHeight,
        referenceDepth * HERO_SCENE_CONFIG.depthMultiplier,
      );
    }
    const center = [
      ((mobileSlot.left + mobileSlot.width * 0.5) / viewportWidth) * 2 - 1,
      1 - ((mobileSlot.top + mobileSlot.height * 0.5) / viewportHeight) * 2,
    ] as const;
    return projectOverviewSlotAtScreenWidth(
      center,
      viewportWidth,
      viewportHeight,
      NAME_WORLD_WIDTH,
      mobileSlot.width * HERO_SCENE_CONFIG.mobileWidthScale,
    );
  }, [isDesktop, mobileSlot, referenceDepth, viewportHeight, viewportWidth]);
  const layoutPosition = useMemo(
    () => [scenePoint[0], scenePoint[2]] as const,
    [scenePoint],
  );
  const sceneLift = useMemo(
    () => scenePoint[1]
      - sampleHeight(shellBase, layoutPosition[0], layoutPosition[1], elevation, seaLevel)
      - centerOffset
      + (isDesktop ? HERO_SCENE_CONFIG.bottomOffset : 0),
    [centerOffset, elevation, isDesktop, layoutPosition, scenePoint, seaLevel, shellBase],
  );
  const compiledVertexShader = useMemo(
    () => sceneTextVertexShader(1),
    [],
  );
  const uniforms = useMemo(() => createSceneTextUniforms({
    atlas,
    heightmap: displacementMap,
    lift: 0,
    hover: new Float32Array(1),
    glitch: new Float32Array(1),
    textTarget: new Float32Array(1),
    layoutOffsetX: new Float32Array(1),
    layoutOffsetZ: new Float32Array(1),
    verticalOffset: new Float32Array(1),
    focusedSpacingMultiplier: 1,
    billboardTilt: MathUtils.degToRad(HERO_SCENE_CONFIG.tiltDegrees),
    jiggleStrength: 1,
    sequencedLetterSwap: 0,
  }), [atlas, displacementMap]);

  useEffect(() => {
    needsMobileSlot.current = true;
  }, [viewportHeight, viewportWidth]);
  useEffect(() => configureSdfAtlas(atlas), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useSceneTextSettings(materialRef, contourSettings, elevation, seaLevel);
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    (material.uniforms.uLayoutOffsetX.value as Float32Array)[0] = layoutPosition[0];
    (material.uniforms.uLayoutOffsetZ.value as Float32Array)[0] = layoutPosition[1];
    material.uniforms.uLift.value = sceneLift;
  }, [layoutPosition, sceneLift]);
  const clearSwapBack = () => {
    if (swapBackTimer.current === null) return;
    window.clearTimeout(swapBackTimer.current);
    swapBackTimer.current = null;
  };
  useEffect(() => clearSwapBack, []);
  useEffect(() => {
    if (!isHidden) return;
    clearSwapBack();
    const material = materialRef.current;
    if (!material) return;
    (material.uniforms.uTextTarget.value as Float32Array)[0] = 0;
    (material.uniforms.uGlitch.value as Float32Array)[0] = 0;
  }, [isHidden]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uTime.value += delta;
    const glitchValues = material.uniforms.uGlitch.value as Float32Array;
    if (glitchValues[0] > 0) {
      const nextGlitch = glitchValues[0]
        * Math.exp(-delta * SCENE_LINK_EFFECT_CONFIG.glitchDecay);
      glitchValues[0] = nextGlitch < SETTLE_EPSILON ? 0 : nextGlitch;
    }
    // The HTML hero mounts after the preloader, so look for its name box until it is laid out.
    if (!isDesktop && needsMobileSlot.current) {
      const slot = measureHeroNameSlot();
      if (slot) {
        needsMobileSlot.current = false;
        setMobileSlot(slot);
      }
    }
    if (!introStarted) {
      elapsed.current = 0;
      dissolve.current = 0;
      material.uniforms.uDissolve.value = 0;
      return;
    }

    elapsed.current += delta;
    const entranceComplete = isReducedMotion
      || elapsed.current >= HERO_SCENE_CONFIG.entranceDelay;
    const visible = !isHidden && isPlaced && entranceComplete && !cameraFrameState.current.transitioning;
    dissolve.current = advanceTextVisibility(dissolve.current, visible, delta, isReducedMotion,
      HERO_SCENE_CONFIG.revealSpeed, HERO_SCENE_CONFIG.hideSpeed);

    material.uniforms.uDissolve.value = dissolve.current;
  });

  const hitTargetPosition = [
    layoutPosition[0],
    sampleHeight(shellBase, layoutPosition[0], layoutPosition[1], elevation, seaLevel)
      + centerOffset
      + sceneLift,
    layoutPosition[1],
  ] as const;
  // Hovering swaps the name to its alternate spelling with a glitch.
  const setHeroTextTarget = (target: number) => {
    if (isHidden || cameraFrameState.current.transitioning || dissolve.current < 1) return;
    const material = materialRef.current;
    if (!material) return;
    (material.uniforms.uTextTarget.value as Float32Array)[0] = target;
    (material.uniforms.uGlitch.value as Float32Array)[0] = isReducedMotion ? 0 : 1;
  };
  // Mobile has no hover: a tap swaps the name, which swaps back on its own (or on the next tap).
  const toggleHeroText = () => {
    const material = materialRef.current;
    if (!material) return;
    clearSwapBack();
    const showingAlternate = (material.uniforms.uTextTarget.value as Float32Array)[0] > 0.5;
    setHeroTextTarget(showingAlternate ? 0 : 1);
    if (showingAlternate) return;
    swapBackTimer.current = window.setTimeout(() => {
      swapBackTimer.current = null;
      setHeroTextTarget(0);
    }, HERO_SCENE_CONFIG.tapSwapHoldMs);
  };
  const hitAreaStyle = isDesktop || !mobileSlot
    ? HERO_SCENE_CONFIG.hoverHitArea
    : {width: `${Math.round(mobileSlot.width)}px`, height: `${Math.round(mobileSlot.height)}px`};

  return (
    <>
      <mesh
        ref={forwardedRef}
        frustumCulled={false}
        geometry={geometry}
        renderOrder={5}
        visible={isPlaced}
      >
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
      {isPlaced ? (
        <Html center position={hitTargetPosition} zIndexRange={[30, 10]}>
          <span
            aria-hidden="true"
            className={`block touch-manipulation bg-transparent
              ${isHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}
            data-hero-name-hit-target
            style={hitAreaStyle}
            onPointerEnter={isDesktop ? () => setHeroTextTarget(1) : undefined}
            onPointerLeave={isDesktop ? () => setHeroTextTarget(0) : undefined}
            onClick={isDesktop ? undefined : toggleHeroText}
          />
        </Html>
      ) : null}
    </>
  );
});
