// The WebGL hero name ("SQYC", swapping to "NIRO" on hover) on desktop; Hero renders the HTML fallback.
// Fades in after the preloader and dissolves whenever a section opens.
'use client';

import {forwardRef, useEffect, useMemo, useRef} from 'react';
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
} from '@/lib/text/sceneLinkLayout';
import {useCameraFrameState} from '../camera/CameraFrameState';
import {linksMedianDepth} from './heroNameLayout';
import {SETTLE_EPSILON} from './sceneLinkMotion';
import {
  createSceneTextUniforms,
  sceneTextFragmentShader,
  sceneTextVertexShader,
  useSceneTextSettings,
} from './sceneTextMaterial';

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
  const cameraFrameState = useCameraFrameState();
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const isReducedMotion = useReducedMotion();
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
  const scenePoint = useMemo(
    () => projectOverviewSlotAtDistance(
      HERO_SCENE_CONFIG.screenPosition,
      viewportWidth,
      viewportHeight,
      referenceDepth * HERO_SCENE_CONFIG.depthMultiplier,
    ),
    [referenceDepth, viewportHeight, viewportWidth],
  );
  const layoutPosition = useMemo(
    () => [scenePoint[0], scenePoint[2]] as const,
    [scenePoint],
  );
  const sceneLift = useMemo(
    () => scenePoint[1]
      - sampleHeight(shellBase, layoutPosition[0], layoutPosition[1], elevation, seaLevel)
      - centerOffset
      + HERO_SCENE_CONFIG.bottomOffset,
    [centerOffset, elevation, layoutPosition, scenePoint, seaLevel, shellBase],
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
  useEffect(() => {
    if (!isHidden) return;
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
    if (!introStarted) {
      elapsed.current = 0;
      dissolve.current = 0;
      material.uniforms.uDissolve.value = 0;
      return;
    }

    elapsed.current += delta;
    const isDesktop = viewportWidth >= HERO_SCENE_CONFIG.desktopMinWidth;
    const entranceComplete = isReducedMotion
      || elapsed.current >= HERO_SCENE_CONFIG.entranceDelay;
    const visible = !isHidden && isDesktop && entranceComplete && !cameraFrameState.current.transitioning;
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
  const isDesktop = viewportWidth >= HERO_SCENE_CONFIG.desktopMinWidth;
  // Hovering swaps the name to its alternate spelling with a glitch.
  const setHeroTextTarget = (target: number) => {
    if (isHidden || cameraFrameState.current.transitioning || dissolve.current < 1) return;
    const material = materialRef.current;
    if (!material) return;
    (material.uniforms.uTextTarget.value as Float32Array)[0] = target;
    (material.uniforms.uGlitch.value as Float32Array)[0] = isReducedMotion ? 0 : 1;
  };

  return (
    <>
      <mesh
        ref={forwardedRef}
        frustumCulled={false}
        geometry={geometry}
        renderOrder={5}
        visible={isDesktop}
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
      {isDesktop ? (
        <Html center position={hitTargetPosition} zIndexRange={[30, 10]}>
          <span
            aria-hidden="true"
            className={`block bg-transparent ${isHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}
            data-hero-name-hit-target
            style={HERO_SCENE_CONFIG.hoverHitArea}
            onPointerEnter={() => setHeroTextTarget(1)}
            onPointerLeave={() => setHeroTextTarget(0)}
          />
        </Html>
      ) : null}
    </>
  );
});
