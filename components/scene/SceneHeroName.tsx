'use client';

import {forwardRef, useEffect, useMemo, useRef} from 'react';
import {Html} from '@react-three/drei';
import {useFrame, useLoader, useThree} from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MathUtils,
  ShaderMaterial,
  TextureLoader,
  Vector3,
} from 'three';
import type {Mesh} from 'three';
import type {
  ContourControlValues,
  TerrainControlValues,
} from '@/components/debug/useSceneControls';
import {HERO_CONTENT, HERO_SCENE_CONFIG} from '@/config/hero';
import {LINK_STREAM_EFFECT_CONFIG, LINK_STREAMS} from '@/config/navigation';
import {
  CONTOUR_CONFIG,
  getCameraPose,
  SCENE_LAYOUT_CONFIG,
  TERRAIN_MATERIAL_CONFIG,
  TERRAIN_MESH_CONFIG,
} from '@/config/scene';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {configureSdfAtlas} from '@/lib/text/atlas';
import {
  buildHorizontalStreamGeometry,
  getLinkStreamHeight,
} from '@/lib/text/linkStreamGeometry';
import {
  getLinkLayouts,
  projectOverviewSlotAtDistance,
} from '@/lib/text/linkStreamLayout';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {sampleHeight} from '@/lib/terrain/height';
import vertexShader from '@/shaders/linkStream.vert';
import fragmentShader from '@/shaders/linkStream.frag';

const ANIMATION_SETTLE_EPSILON = 0.0001;

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
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const isReducedMotion = useReducedMotion();
  const {elevation, seaLevel} = terrainSettings;
  const {displacementMap, shellBase} = useTerrainAssets();
  const geometry = useMemo(() => buildHorizontalStreamGeometry({
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
    () => getLinkLayouts(
      LINK_STREAMS,
      viewportWidth,
      viewportHeight,
      shellBase,
      elevation,
      seaLevel,
    ),
    [elevation, seaLevel, shellBase, viewportHeight, viewportWidth],
  );
  const referenceDepth = useMemo(() => {
    const overviewPose = getCameraPose(
      null,
      viewportWidth < SCENE_LAYOUT_CONFIG.mobileMaxWidth,
    );
    const cameraPosition = new Vector3(...overviewPose.position);
    const distances = LINK_STREAMS.map((run) => {
      const [x, z] = linkLayouts.overview[run.index];
      const y = sampleHeight(shellBase, x, z, elevation, seaLevel)
        + run.overviewBottomOffset
        + getLinkStreamHeight(run) * 0.5
        + LINK_STREAM_EFFECT_CONFIG.lift;
      return cameraPosition.distanceTo(new Vector3(x, y, z));
    }).sort((a, b) => a - b);
    return distances[Math.floor((distances.length - 1) * 0.5)];
  }, [elevation, linkLayouts.overview, seaLevel, shellBase, viewportWidth]);
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
    () => vertexShader.replace('__LINK_STREAM_COUNT__', '1'),
    [],
  );
  const uniforms = useMemo(() => ({
    heightmap: {value: displacementMap},
    elevation: {value: TERRAIN_MATERIAL_CONFIG.elevation},
    contrast: {value: TERRAIN_MATERIAL_CONFIG.contrast},
    seaLevel: {value: TERRAIN_MATERIAL_CONFIG.seaLevel},
    planeSize: {value: TERRAIN_MESH_CONFIG.planeSize},
    meshY: {value: TERRAIN_MESH_CONFIG.position[1]},
    uLift: {value: 0},
    uTime: {value: 0},
    uHover: {value: new Float32Array(1)},
    uGlitch: {value: new Float32Array(1)},
    uTextTarget: {value: new Float32Array(1)},
    uLayoutOffsetX: {value: new Float32Array(1)},
    uLayoutOffsetZ: {value: new Float32Array(1)},
    uVerticalOffset: {value: new Float32Array(1)},
    uDissolve: {value: 0},
    uActiveStream: {value: -1},
    uFocused: {value: 0},
    uFocusedSpacingMultiplier: {value: 1},
    uBillboardTilt: {value: MathUtils.degToRad(HERO_SCENE_CONFIG.tiltDegrees)},
    uJiggleStrength: {value: 1},
    uSequencedLetterSwap: {value: 0},
    uAtlas: {value: atlas},
    uDecorationColor: {value: new Color(CONTOUR_CONFIG.minorColor)},
    uStreamColor: {value: new Color(CONTOUR_CONFIG.majorColor)},
    uHotColor: {value: new Color(CONTOUR_CONFIG.pulseColor)},
  }), [atlas, displacementMap]);

  useEffect(() => configureSdfAtlas(atlas), [atlas]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.elevation.value = elevation;
    material.uniforms.seaLevel.value = seaLevel;
    material.uniforms.uDecorationColor.value.set(contourSettings.minorColor);
    material.uniforms.uStreamColor.value.set(contourSettings.majorColor);
    material.uniforms.uHotColor.value.set(contourSettings.pulseColor);
  }, [
    contourSettings.majorColor,
    contourSettings.minorColor,
    contourSettings.pulseColor,
    elevation,
    seaLevel,
  ]);
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
        * Math.exp(-delta * LINK_STREAM_EFFECT_CONFIG.glitchDecay);
      glitchValues[0] = nextGlitch < ANIMATION_SETTLE_EPSILON ? 0 : nextGlitch;
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
    const target = !isHidden && isDesktop && entranceComplete ? 1 : 0;

    if (isReducedMotion) {
      dissolve.current = target;
    } else {
      const speed = target > dissolve.current
        ? HERO_SCENE_CONFIG.revealSpeed
        : HERO_SCENE_CONFIG.hideSpeed;
      const direction = Math.sign(target - dissolve.current);
      dissolve.current += direction * Math.min(
        Math.abs(target - dissolve.current),
        delta * speed,
      );
    }

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
  const setHeroTextTarget = (target: number) => {
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
          fragmentShader={fragmentShader}
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
