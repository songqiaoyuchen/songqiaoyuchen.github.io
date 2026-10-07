// About experience path: a route draped over the ridge through one checkpoint per timeline entry, ending at "Next?".
// The whole route shows faintly; the part up to the drawer's reading head is drawn bright and blooms like the
// major contours. Also publishes each checkpoint's camera framing for CameraRig.
'use client';

import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {
  AdditiveBlending, CatmullRomCurve3, Color, PerspectiveCamera, TubeGeometry, UniformsLib, UniformsUtils,
  type DepthTexture, type Group, type Mesh, type ShaderMaterial,
} from 'three';
import type {
  AboutPathControlValues,
  TerrainControlValues,
} from '@/components/scene/controls/useSceneControls';
import {
  CAMERA_CONFIG, CONTOUR_CONFIG, getCameraPose, SCENE_LAYOUT_CONFIG, type CameraPose,
} from '@/config/scene';
import {ABOUT_MAP_CONFIG, ABOUT_PATH_CONFIG, ABOUT_ROUTE} from '@/config/scene/aboutPath';
import {ABOUT_TIMELINE, formatEntryStart} from '@/data/about';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {getHomeFov} from '@/lib/scene/camera';
import {buildAboutRoute, getAboutFocusPose, placeAltitudeMarks} from '@/lib/scene/aboutPath';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {normalizeRawHeight, sampleHeight, sampleNormalizedHeight} from '@/lib/terrain/height';
import fragmentShader from '@/shaders/terrain/aboutPath.frag';
import vertexShader from '@/shaders/terrain/aboutPath.vert';
import {AboutCallouts, type CalloutItem} from './AboutCallouts';

const STOP_IDS = [...ABOUT_TIMELINE.map((entry) => entry.id), 'next'] as const;
const NEXT_INDEX = STOP_IDS.length - 1;
const FADE_RATE = 4;
const DRAW_RATE = 3;

const CALLOUT_ITEMS: readonly CalloutItem[] = [
  ...ABOUT_TIMELINE.map((entry) => ({
    id: entry.id,
    label: entry.title,
    meta: `${entry.category} · ${formatEntryStart(entry.start)}`,
    isNext: false,
  })),
  {id: 'next', label: 'Next?', meta: '', isNext: true},
];

function ease(value: number, target: number, rate: number, delta: number, instant: boolean) {
  if (instant || Math.abs(value - target) < 0.0005) return target;
  return value + (target - value) * (1 - Math.exp(-rate * Math.min(delta, 1 / 30)));
}

type AboutPathProps = {
  visible: boolean;
  /** -1 for the overview, an entry index, or the "Next?" index after the last entry. */
  activeStop: number;
  /** The drawer's reading head in stops; the route is drawn up to it. */
  progressRef: MutableRefObject<number>;
  /** Receives the path mesh for the bloom pass. */
  meshRef: (mesh: Mesh | null) => void;
  settings: AboutPathControlValues;
  terrainSettings: TerrainControlValues;
  terrainDepthTexture: DepthTexture | null;
  /** Receives the camera pose framing each checkpoint, in stop order. */
  focusPosesRef: MutableRefObject<readonly CameraPose[]>;
  onSelect: (stop: number) => void;
};

export function AboutPath({
  visible: requestedVisible, activeStop, progressRef, meshRef, settings, terrainSettings, terrainDepthTexture,
  focusPosesRef, onSelect,
}: AboutPathProps) {
  // Phones cover the scene with a full-width drawer and keep the overview camera.
  const {width, height} = useThree((state) => state.size);
  const isMobile = width < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const visible = requestedVisible && !isMobile;
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const reducedMotion = useReducedMotion();
  const {shellBase} = useTerrainAssets();
  const {elevation, seaLevel} = terrainSettings;
  const {focusScreen, focusFollow, focusZoom} = settings;
  const [focusX, focusY] = focusScreen;
  const checkpointKey = JSON.stringify(STOP_IDS.map((id) => settings[id]));

  const route = useMemo(() => buildAboutRoute(
    ABOUT_ROUTE,
    JSON.parse(checkpointKey) as [number, number][],
    (x, z) => sampleHeight(shellBase, x, z, elevation, seaLevel) + ABOUT_PATH_CONFIG.lift,
  ), [checkpointKey, elevation, seaLevel, shellBase]);

  // Altitude figures on the map contours beside the route.
  const marks = useMemo(() => {
    let rawMin = Infinity;
    let rawMax = -Infinity;
    for (const raw of shellBase.data) {
      rawMin = Math.min(rawMin, raw);
      rawMax = Math.max(rawMax, raw);
    }
    const min = normalizeRawHeight(rawMin, seaLevel);
    return placeAltitudeMarks(
      route,
      (x, z) => sampleNormalizedHeight(shellBase, x, z, seaLevel),
      (x, z) => sampleHeight(shellBase, x, z, elevation, seaLevel),
      {min, span: normalizeRawHeight(rawMax, seaLevel) - min, count: ABOUT_MAP_CONFIG.contours.levels},
      ABOUT_MAP_CONFIG.altitudes,
    );
  }, [elevation, route, seaLevel, shellBase]);

  const geometry = useMemo(() => new TubeGeometry(
    new CatmullRomCurve3(route.points),
    route.points.length * 2,
    ABOUT_PATH_CONFIG.radius,
    6,
  ), [route]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    // Frame with the projection CameraRig will use at this viewport.
    const camera = new PerspectiveCamera(
      getHomeFov(width, height, CAMERA_CONFIG.fov, SCENE_LAYOUT_CONFIG),
      width / Math.max(height, 1),
    );
    const base = getCameraPose('about');
    focusPosesRef.current = route.stops.map((stop) => (
      getAboutFocusPose(base, camera, stop, [focusX, focusY], focusFollow, focusZoom)
    ));
  }, [focusFollow, focusPosesRef, focusX, focusY, focusZoom, height, route, width]);

  const uniforms = useMemo(() => ({
    ...UniformsUtils.clone(UniformsLib.fog),
    uTerrainDepth: {value: null as DepthTexture | null},
    uUseTerrainDepth: {value: 0},
    uDepthBias: {value: CONTOUR_CONFIG.depthBias},
    uVisibility: {value: 0},
    uDrawn: {value: 0},
    uOpenFrom: {value: 1},
    uLength: {value: 1},
    uDashLength: {value: ABOUT_PATH_CONFIG.dashLength},
    uTrackColor: {value: new Color()},
    uDrawnColor: {value: new Color()},
  }), []);

  const {trailColor} = settings;
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTrackColor.value.set(trailColor).multiplyScalar(ABOUT_PATH_CONFIG.trackIntensity);
    material.uniforms.uDrawnColor.value.set(trailColor).multiplyScalar(ABOUT_PATH_CONFIG.drawnIntensity);
  }, [trailColor]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uOpenFrom.value = route.stopFractions[NEXT_INDEX - 1];
    material.uniforms.uLength.value = route.length;
  }, [route]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTerrainDepth.value = terrainDepthTexture;
    material.uniforms.uUseTerrainDepth.value = terrainDepthTexture ? 1 : 0;
  }, [terrainDepthTexture]);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const {uDrawn, uVisibility} = material.uniforms;
    uVisibility.value = ease(uVisibility.value, visible ? 1 : 0, FADE_RATE, delta, reducedMotion);
    const progress = Math.min(Math.max(progressRef.current, 0), NEXT_INDEX);
    const segment = Math.min(Math.floor(progress), NEXT_INDEX - 1);
    const {stopFractions} = route;
    const drawnTarget = stopFractions[segment]
      + (stopFractions[segment + 1] - stopFractions[segment]) * (progress - segment);
    uDrawn.value = ease(uDrawn.value, drawnTarget, DRAW_RATE, delta, reducedMotion);
    if (groupRef.current) groupRef.current.visible = uVisibility.value > 0;
  });

  return (
    <>
      <group ref={groupRef} visible={false}>
        <mesh frustumCulled={false} geometry={geometry} ref={meshRef} renderOrder={2}>
          <shaderMaterial
            ref={materialRef}
            blending={AdditiveBlending}
            depthWrite={false}
            fog
            fragmentShader={fragmentShader}
            transparent
            uniforms={uniforms}
            vertexShader={vertexShader}
          />
        </mesh>
      </group>
      {visible ? (
        <AboutCallouts
          activeStop={activeStop}
          items={CALLOUT_ITEMS}
          marks={marks}
          signalColor={trailColor}
          onSelect={onSelect}
          stops={route.stops}
        />
      ) : null}
    </>
  );
}
