// About experience path: a route draped over the ridge through one checkpoint per timeline entry, ending at "Next?".
// The whole route shows faintly; the part up to the drawer's reading head is drawn bright and blooms like the
// major contours. Also publishes how to frame each checkpoint from an About pose, for CameraRig (the configured
// pose, phones having their own, or the one composed with Edit camera). While the Places morph runs, the route
// rides onto the globe with the terrain (aboutPath.vert, from the patch frame PlacesGlobe publishes) and
// dissolves as the landscape recedes, so a journey between About and Places keeps it on the ground. In
// development, Edit route (AboutPathEditor) reshapes the route and slides the checkpoints along it.
'use client';

import {useFrame, useThree} from '@react-three/fiber';
import {useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject} from 'react';
import {
  AdditiveBlending, CatmullRomCurve3, Color, PerspectiveCamera, TubeGeometry, UniformsLib, UniformsUtils,
  Vector2, Vector3, type DepthTexture, type Group, type Mesh, type ShaderMaterial,
} from 'three';
import {setAboutCheckpoint} from '@/components/scene/controls/useAboutPathControls';
import type {
  AboutPathControlValues,
  TerrainControlValues,
} from '@/components/scene/controls/useSceneControls';
import {
  CAMERA_CONFIG, CONTOUR_CONFIG, SCENE_LAYOUT_CONFIG,
} from '@/config/scene';
import {ABOUT_MAP_CONFIG, ABOUT_PATH_CONFIG, ABOUT_ROUTE, type PlanPoint} from '@/config/scene/aboutPath';
import {ABOUT_STOP_IDS, ABOUT_TIMELINE, formatEntryStart} from '@/data/about';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {getHomeFov} from '@/lib/scene/camera';
import {buildAboutRoute, getAboutFocusPose, placeAltitudeMarks, type AboutFraming} from '@/lib/scene/aboutPath';
import {rideDissolve} from '@/lib/scene/places';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {
  normalizeRawHeight, sampleHeight, sampleNormalizedHeight, sampleSurfaceHeight,
} from '@/lib/terrain/height';
import fragmentShader from '@/shaders/terrain/aboutPath.frag';
import vertexShader from '@/shaders/terrain/aboutPath.vert';
import {useCameraFrameState} from '../camera/CameraFrameState';
import {AboutCallouts, type CalloutItem} from './AboutCallouts';
import {AboutPathEditor} from './AboutPathEditor';

const STOP_IDS = ABOUT_STOP_IDS;
const NEXT_INDEX = STOP_IDS.length - 1;
const FADE_RATE = 4;
const DRAW_RATE = 3;
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

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
  /** Receives the framing of each checkpoint from an About pose. */
  framingRef: MutableRefObject<AboutFraming | null>;
  onSelect: (stop: number) => void;
};

export function AboutPath({
  visible: requestedVisible, activeStop, progressRef, meshRef, settings, terrainSettings, terrainDepthTexture,
  framingRef, onSelect,
}: AboutPathProps) {
  // Phones frame the route in a window above the drawer, which starts below it.
  const {width, height} = useThree((state) => state.size);
  const isMobile = width < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const visible = requestedVisible;
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const cameraFrameState = useCameraFrameState();
  // The route's own fade; on the ride it is dimmed further as the landscape recedes.
  const fade = useRef(0);
  const reducedMotion = useReducedMotion();
  const {shellBase} = useTerrainAssets();
  const {elevation, seaLevel} = terrainSettings;
  // Phones frame an entry from their own About pose, toward a point in the window above the drawer.
  const {lift} = settings;
  const [focusX, focusY] = isMobile ? settings.phoneFocusScreen : settings.focusScreen;
  const focusFollow = isMobile ? settings.phoneFocusFollow : settings.focusFollow;
  const focusZoom = isMobile ? settings.phoneFocusZoom : settings.focusZoom;
  // The route's waypoints only change in development, through the editor.
  const [waypoints, setWaypoints] = useState<readonly PlanPoint[]>(ABOUT_ROUTE.waypoints);
  const [editing, setEditing] = useState(false);
  const checkpointKey = JSON.stringify(STOP_IDS.map((id) => settings[id]));
  const checkpoints = useMemo(() => JSON.parse(checkpointKey) as PlanPoint[], [checkpointKey]);
  const editableCheckpoints = useMemo(
    () => STOP_IDS.map((id, index) => ({id, point: checkpoints[index]})),
    [checkpoints],
  );

  // On the rendered surface (not the text sampler, which clears it by a fixed margin) plus the tuned lift.
  const heightAt = useCallback(
    (x: number, z: number) => sampleSurfaceHeight(shellBase, x, z, elevation, seaLevel) + lift,
    [elevation, lift, seaLevel, shellBase],
  );
  const route = useMemo(
    () => buildAboutRoute(waypoints, checkpoints, heightAt),
    [checkpoints, heightAt, waypoints],
  );

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

  const radius = ABOUT_PATH_CONFIG.radius * (isMobile ? ABOUT_PATH_CONFIG.phoneRadiusScale : 1);
  const geometry = useMemo(
    () => new TubeGeometry(new CatmullRomCurve3(route.points), route.points.length * 2, radius, 6),
    [radius, route],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    // Frame with the projection CameraRig will use at this viewport.
    const camera = new PerspectiveCamera(
      getHomeFov(width, height, CAMERA_CONFIG.fov, SCENE_LAYOUT_CONFIG),
      width / Math.max(height, 1),
    );
    framingRef.current = (base, stop) => (route.stops[stop]
      ? getAboutFocusPose(base, camera, route.stops[stop], [focusX, focusY], focusFollow, focusZoom)
      : null);
  }, [focusFollow, framingRef, focusX, focusY, focusZoom, height, route, width]);

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
    uRadius: {value: ABOUT_PATH_CONFIG.radius},
    uMorph: {value: 0},
    uGlobeCenter: {value: new Vector3()},
    uGlobeRadius: {value: 1},
    uPatchAnchor: {value: new Vector3(0, 1, 0)},
    uPatchEast: {value: new Vector3(-1, 0, 0)},
    uPatchNorth: {value: new Vector3(0, 0, 1)},
    uPatchPivot: {value: new Vector2()},
    uPatchScale: {value: 1},
    uPatchRelief: {value: 1},
    uSeaUnits: {value: 0},
    uDatumY: {value: 0},
  }), []);

  useEffect(() => {
    const material = materialRef.current;
    if (material) material.uniforms.uRadius.value = radius;
  }, [radius]);

  // Phones see the whole route from far off: the trail ahead brighter, its dashes longer.
  const {trailColor} = settings;
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    const {trackIntensity, phoneTrackIntensity, drawnIntensity, dashLength, phoneDashScale} = ABOUT_PATH_CONFIG;
    material.uniforms.uTrackColor.value.set(trailColor).multiplyScalar(isMobile ? phoneTrackIntensity : trackIntensity);
    material.uniforms.uDrawnColor.value.set(trailColor).multiplyScalar(drawnIntensity);
    material.uniforms.uDashLength.value = dashLength * (isMobile ? phoneDashScale : 1);
  }, [isMobile, trailColor]);

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

  // After PlacesGlobe (0.1) has placed the patch for the frame, with the terrain and contours (0.2).
  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const {uDrawn, uVisibility, uMorph} = material.uniforms;
    fade.current = ease(fade.current, visible ? 1 : 0, FADE_RATE, delta, reducedMotion);
    const {placesMorph, placesPatch: patch} = cameraFrameState.current;
    const riding = placesMorph > 0 && placesMorph < 1;
    uMorph.value = riding ? placesMorph : 0;
    if (riding) {
      const {uGlobeCenter, uGlobeRadius, uPatchAnchor, uPatchEast, uPatchNorth, uPatchPivot, uPatchScale,
        uPatchRelief, uSeaUnits, uDatumY} = material.uniforms;
      uGlobeCenter.value.copy(patch.center);
      uGlobeRadius.value = patch.radius;
      uPatchAnchor.value.copy(patch.anchor);
      uPatchEast.value.copy(patch.east);
      uPatchNorth.value.copy(patch.north);
      uPatchPivot.value.set(patch.pivot.x, patch.pivot.z);
      uPatchScale.value = patch.scale;
      uPatchRelief.value = patch.relief;
      uSeaUnits.value = patch.seaUnits;
      uDatumY.value = patch.datumY;
    }
    uVisibility.value = fade.current * (riding ? rideDissolve(placesMorph) : 1);
    const progress = Math.min(Math.max(progressRef.current, 0), NEXT_INDEX);
    const segment = Math.min(Math.floor(progress), NEXT_INDEX - 1);
    const {stopFractions} = route;
    const drawnTarget = stopFractions[segment]
      + (stopFractions[segment + 1] - stopFractions[segment]) * (progress - segment);
    uDrawn.value = ease(uDrawn.value, drawnTarget, DRAW_RATE, delta, reducedMotion);
    if (groupRef.current) groupRef.current.visible = uVisibility.value > 0;
  }, 0.2);

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
          editing={editing}
          items={CALLOUT_ITEMS}
          marks={marks}
          signalColor={trailColor}
          onSelect={onSelect}
          stops={route.stops}
        />
      ) : null}
      {IS_DEVELOPMENT && visible && !isMobile ? (
        <AboutPathEditor
          checkpoints={editableCheckpoints}
          heightAt={heightAt}
          signalColor={trailColor}
          waypoints={waypoints}
          onCheckpointChange={setAboutCheckpoint}
          onEditingChange={setEditing}
          onWaypointsChange={setWaypoints}
        />
      ) : null}
    </>
  );
}
