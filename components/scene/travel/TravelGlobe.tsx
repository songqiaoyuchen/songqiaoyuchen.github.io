// Travel globe: a night globe (the dark sphere with a gold rim, land a field of light points, faint graticule and
// coastlines, orbit rings about it and stars behind), with the trips' trails and markers, hung above the terrain's
// centre. The
// camera parks at the Travel pose; the globe itself turns: dragged, it follows the pointer; let go, it coasts and
// settles on the nearest trip within reach (lib/scene/travel.ts); opening or closing a trip, the globe turns the trip
// to its marker point alongside the camera's zoom (to the quarter-sphere framing this layer publishes, or back to
// the Travel pose): holding at first, then covering most of the way by the time the camera lands, the last of it a
// slight settle. The way in is one zoom-out: the
// globe begins as the planet under the landscape (Earth-sized for the width the landscape stands for, tangent at the
// camera's point of regard, heights above sea level) and shrinks geometrically into place while the terrain and
// the home contour lines ride on it (terrain.vert, contours.vert), the landscape's edge handing its heights to the
// baked regional tile the globe reads around the landing place; this layer places the planet for the frame's
// morph and publishes the patch frame they need. The lights come on as the landscape recedes; the stars, the rim,
// lines and trails come in with altitude, like map labels. With a trip open the globe eases into a raised-relief
// map (globe.frag), the trails, lights and markers riding its summarized, heightened ground.
'use client';

import {useFrame, useThree, type ThreeEvent} from '@react-three/fiber';
import {useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject} from 'react';
import {
  BufferGeometry, Color, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, MathUtils, Matrix4, Mesh,
  PerspectiveCamera, Points, Quaternion, ShaderMaterial, SphereGeometry, Vector2, Vector3,
  type DepthTexture, type Object3D, type Texture,
} from 'three';
import type {
  TravelControlValues, TravelOverviewControlValues, TravelTripControlValues,
} from '@/components/scene/controls/useSceneControls';
import {useTravelScene} from '@/components/travel/TravelSceneContext';
import type {GlobeFront} from '@/components/travel/TravelSceneContext';
import type {GlobeOutline} from '@/components/travel/useTripSheetPlacement';
import {BLOOM_LAYER} from '@/components/scene/effects/IsolatedBloom';
import {
  FOG_CONFIG, getCameraPose, SCENE_LAYOUT_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG, type CameraPose,
} from '@/config/scene';
import {getTravelTripPose} from '@/config/scene/camera';
import {TRAVEL_CONFIG, TRAVEL_OVERVIEW_CONFIG, TRAVEL_TRIP_CONFIG} from '@/config/scene/travel';
import {TRIPS, type LonLat} from '@/data/travel';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {
  advanceGlobe, aimForOffset, anglesToward, createGlobeState, createGlobeView, densifyTrack, EARTH_RADIUS_KM,
  facingAngles, focusedTrip, globeQuaternion, graticulePositions, lonLatToUnit, offsetForMarker, planetScale,
  projectGlobe, regionSpread,
  releaseGlobe, rideDistance, toGlobeSettings, viewFromCamera, wrapAngle,
} from '@/lib/scene/travel';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {sampleSurfaceHeight} from '@/lib/terrain/height';
import fragmentShader from '@/shaders/terrain/globe.frag';
import vertexShader from '@/shaders/terrain/globe.vert';
import {useCameraFrameState} from '../camera/CameraFrameState';
import '@/lib/scene/landShading';
import {TravelCallouts} from './TravelCallouts';
import {TravelLights} from './TravelLights';
import {TravelRings} from './TravelRings';
import {TravelStars} from './TravelStars';
import {TravelTrails} from './TravelTrails';
import {useCoastlines} from './useCoastlines';
import {useElevation} from './useElevation';
import {useRegion} from './useRegion';

const FADE_RATE = 4;
// Back to all trips, the rings, other markers and titles come in more slowly than they leave.
const REVEAL_RATE = 3;
// The rings' spin eases toward the globe's turn this fast, per second; turns slower than RING_TURN_BELOW degrees per
// second (the servo settling, a coast dying out) leave their drift direction as it was.
const RING_FOLLOW_RATE = 10;
const RING_TURN_BELOW = 3;
const FOCUS_RELEASE = 5; // degrees past focusWithin a focused trip keeps focus
const FOCUS_STEP = 1; // degrees between a route's samples for the focus zone
const SILHOUETTE_POINTS = 36;

type OutlineScratch = {toCamera: Vector3; u: Vector3; v: Vector3; point: Vector3; points: number[]};

/**
 * The sphere's silhouette as the camera draws it, CSS pixels: the ring of points where the view rays touch
 * it, projected. Exact where a circle about the projected centre is not (close up, off the axis).
 */
function silhouette(
  camera: PerspectiveCamera, center: Vector3, sphereRadius: number, width: number, height: number,
  scratch: OutlineScratch,
): GlobeOutline {
  const {toCamera, u, v, point, points} = scratch;
  toCamera.copy(camera.position).sub(center);
  const distance = toCamera.length();
  points.length = 0;
  const seen = point.copy(center).project(camera);
  const x = (seen.x + 1) / 2 * width;
  const y = (1 - seen.y) / 2 * height;
  if (distance <= sphereRadius) return {x, y, points};
  toCamera.divideScalar(distance);
  u.crossVectors(toCamera, UP);
  if (u.lengthSq() < 1e-8) u.set(1, 0, 0);
  u.normalize();
  v.crossVectors(toCamera, u);
  // The tangent ring: a circle in the plane facing the camera, sphereRadius^2 / distance along the way to it.
  const along = sphereRadius * sphereRadius / distance;
  const ringRadius = sphereRadius * Math.sqrt(1 - along / distance);
  for (let index = 0; index < SILHOUETTE_POINTS; index++) {
    const angle = index / SILHOUETTE_POINTS * Math.PI * 2;
    point.copy(center).addScaledVector(toCamera, along)
      .addScaledVector(u, Math.cos(angle) * ringRadius).addScaledVector(v, Math.sin(angle) * ringRadius)
      .project(camera);
    points.push((point.x + 1) / 2 * width, (1 - point.y) / 2 * height);
  }
  return {x, y, points};
}
const RELEASE_WINDOW_MS = 80;
const PLACES = TRIPS.map((trip) => trip.place.lonLat);
// Where each trip can be in focus: its place, its stops and anywhere along its route.
const FOCUS_POINTS = TRIPS.map((trip) => [
  lonLatToUnit(trip.place.lonLat), ...(trip.stops ?? []).map((stop) => lonLatToUnit(stop.lonLat)),
  ...densifyTrack((trip.segments ?? []).flat(), FOCUS_STEP),
]);
const UP = new Vector3(0, 1, 0);
const DEG = Math.PI / 180;

type DragSample = {vYaw: number; vPitch: number; time: number};

function ease(value: number, target: number, rate: number, delta: number, instant: boolean) {
  if (instant || Math.abs(value - target) < 0.0005) return target;
  return value + (target - value) * (1 - Math.exp(-rate * Math.min(delta, 1 / 30)));
}

/** Sets `target` up like `like` (lens) at `pose`. */
function poseCamera(target: PerspectiveCamera, pose: CameraPose, like: PerspectiveCamera) {
  target.fov = like.fov;
  target.aspect = like.aspect;
  target.near = like.near;
  target.far = like.far;
  target.position.fromArray(pose.position);
  target.lookAt(pose.lookAt[0], pose.lookAt[1], pose.lookAt[2]);
  target.updateMatrixWorld(true);
  target.updateProjectionMatrix();
}

type TravelGlobeProps = {
  visible: boolean;
  /** False while the development orbit camera owns the pointer; an open trip parks the pointer too. */
  interactive?: boolean;
  /** The development orbit camera is editing the pose: it turns about the globe and the globe holds still. */
  editingCamera?: boolean;
  /** Receives a reader of the open trip's marker offset as the camera now draws it (Save Camera keeps it). */
  measureOffsetRef?: MutableRefObject<(() => [number, number] | null) | null>;
  /** Receives the globe's outline on screen (CSS pixels) every frame, for the trip panel to keep clear of. */
  globeOutlineRef?: MutableRefObject<GlobeOutline | null>;
  /** Receives the place at the globe's centre as seen every frame, once arrived, for the trip index. */
  globeFrontRef?: MutableRefObject<GlobeFront | null>;
  /** The globe as both views draw it, and the zoom-out (TRAVEL_CONFIG). */
  settings: TravelControlValues;
  /** All trips: the resting globe's ground and its feel by hand (TRAVEL_OVERVIEW_CONFIG). */
  overviewSettings: TravelOverviewControlValues;
  /** A selected trip: its framing, journey and raised-relief look (TRAVEL_TRIP_CONFIG). */
  tripSettings: TravelTripControlValues;
  /** The terrain cache's depth and colour: the morphing terrain hides what lies behind it, fading in at its rim. */
  terrainDepthTexture: DepthTexture | null;
  terrainColorTexture: Texture | null;
  /** Receives the lines and trails for the bloom pass. */
  onBloomObjects: (objects: Object3D[]) => void;
  /** The trip the globe rests on or is about to land on, for the trip index. */
  onCapture: (id: string | null) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

export function TravelGlobe({
  visible, interactive: pointerFree = true, editingCamera = false, measureOffsetRef, globeOutlineRef, globeFrontRef,
  settings, overviewSettings, tripSettings, terrainDepthTexture, terrainColorTexture, onBloomObjects,
  onCapture, onSelect, onHover,
}: TravelGlobeProps) {
  // The trip pinned by the route (null for the overview) and the trip under the pointer in the trip index or on
  // its marker, read here through the canvas's context bridge so a change re-renders this layer alone.
  const {selectedId, hoveredId} = useTravelScene();
  const interactive = pointerFree && selectedId === null;
  const {width, height} = useThree((state) => state.size);
  const getState = useThree((state) => state.get);
  const isMobile = width < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const reducedMotion = useReducedMotion();
  const cameraFrameState = useCameraFrameState();
  const groupRef = useRef<Group>(null);
  const frameRef = useRef<Group>(null);
  const shellRef = useRef<ShaderMaterial>(null);
  const graticuleRef = useRef<LineSegments>(null);
  const graticuleMaterialRef = useRef<LineBasicMaterial>(null);
  const coastRef = useRef<LineSegments>(null);
  const coastMaterialRef = useRef<LineBasicMaterial>(null);
  const [trailMeshes, setTrailMeshes] = useState<Mesh[]>([]);
  const [lightPoints, setLightPoints] = useState<Points | null>(null);
  const [starPoints, setStarPoints] = useState<Points | null>(null);
  const [ringLines, setRingLines] = useState<LineSegments[]>([]);
  const coastPositions = useCoastlines(TRAVEL_CONFIG.coastSrc);
  const elevation = useElevation(TRAVEL_CONFIG.elevationSrc, tripSettings.summaryBlur);
  const region = useRegion(TRAVEL_CONFIG.regionSrc, TRAVEL_CONFIG.regionMetaSrc);
  const {shellBase} = useTerrainAssets();
  const {radius, center: centerTuple, graticuleStep, trailStep, trailLift} = TRAVEL_CONFIG;
  const center = useMemo(() => new Vector3(...centerTuple), [centerTuple]);
  const {
    baseColor, rimColor, rimIntensity, lineColor, graticuleIntensity, coastIntensity, trailColor,
    lightDensity, lightSize, starSize, landscapeKm, linesIn,
  } = settings;
  const {
    relief, landTint, trailRadius, markerSize, clusterWithin, phoneClusterWithin, friction, snapBelow, capture,
    snapRate, idleDrift, idleAfter, focusWithin, innerRingTilt, outerRingTilt,
  } = overviewSettings;
  const {
    markerOffset, phoneMarkerOffset, holdRate, focusSeconds, turnFrom, turnSettle, revealAt,
    relief: tripRelief, shade: tripShade, landTint: tripTint, trailRadius: tripTrailRadius,
    markerSize: tripMarkerSize,
  } = tripSettings;
  const {patchRelief, vanish, maxPitch} = TRAVEL_CONFIG;
  const {stopsFrom} = TRAVEL_TRIP_CONFIG;
  const {shade} = TRAVEL_OVERVIEW_CONFIG;
  // Phones frame a trip at the top of the screen, above its sheet.
  const [offsetX, offsetY] = isMobile ? phoneMarkerOffset : markerOffset;
  const [linesFrom, linesTo] = linesIn;
  const [reliefFrom, reliefTo] = TRAVEL_CONFIG.reliefIn;
  // The planet's datum: the landing place's elevation in landscape units, and the terrain surface at the pivot.
  const {metresPerUnit} = planetScale(landscapeKm, TERRAIN_MESH_CONFIG.planeSize, radius, 0);
  const seaUnits = (region?.meta.anchorMetres ?? 0) / metresPerUnit;
  const overviewPose = getCameraPose(null, isMobile);
  const datumY = useMemo(() => sampleSurfaceHeight(
    shellBase, overviewPose.lookAt[0], overviewPose.lookAt[2],
    TERRAIN_MATERIAL_CONFIG.elevation, TERRAIN_MATERIAL_CONFIG.seaLevel,
  ), [overviewPose.lookAt, shellBase]);
  const trailSettings = useMemo(
    () => ({trailColor, trailRadius, tripTrailRadius, trailLift, trailStep}),
    [trailColor, trailLift, trailRadius, trailStep, tripTrailRadius],
  );
  const selectedIndex = TRIPS.findIndex((trip) => trip.id === selectedId);
  // Leaving Travel from a trip, the route (and so the selection) changes while the globe is still shrinking away:
  // the globe keeps that trip (turned to its marker, its rings gone, its raised look easing out) until it is gone,
  // rather than swinging back to the overview mid-way. Held from the last frame Travel was open.
  const heldSelected = useRef(selectedIndex);
  const hoveredIndex = TRIPS.findIndex((trip) => trip.id === hoveredId);
  // Set by the markers while a cluster is fanned out: the globe holds still under it.
  const hold = useRef(false);
  // The servo's feel: the overview's by hand; with a trip open only its hold rate turns the globe.
  const overviewGlobe = useMemo(() => toGlobeSettings({
    friction, snapBelow, capture, snapRate, idleDrift, idleAfter, maxPitch,
  }), [capture, friction, idleAfter, idleDrift, maxPitch, snapBelow, snapRate]);
  const tripGlobe = useMemo(() => ({...overviewGlobe, snapRate: holdRate}), [holdRate, overviewGlobe]);

  // Rotation state lives outside React: it changes every frame.
  const state = useRef(createGlobeState());
  const view = useRef(createGlobeView());
  const aim = useRef(new Vector3());
  // Opening or closing a trip: the globe's turn to the trip, from its orientation when the journey began; started
  // once the zoom cues it, elapsed on its own clock.
  const focusTurn = useRef({
    active: false, started: false, elapsed: 0, place: -1, progress: -1,
    from: new Quaternion(), to: new Quaternion(), inverse: new Quaternion(), front: new Vector3(),
    camera: new PerspectiveCamera(), view: createGlobeView(), aim: new Vector3(),
  });
  // Callout opacity (shown once the globe has arrived) and the altitude levels of lines, trails, lights and stars.
  const visibility = useRef(0);
  const lod = useRef(0);
  const trailLod = useRef(0);
  const lightLod = useRef(0);
  const starLod = useRef(0);
  const outlineScratch = useMemo<OutlineScratch>(
    () => ({toCamera: new Vector3(), u: new Vector3(), v: new Vector3(), point: new Vector3(), points: []}), []);
  // The rings: how far in (with the lines, gone while a trip is open) and their spin factor from the globe's turn.
  const ringLod = useRef(0);
  const ringSpin = useRef(1);
  const ringDirection = useRef(1);
  const previousYaw = useRef<number | null>(null);
  // 1 over all trips, eased to 0 while a trip is open and back only as the return turn settles: the rings, the
  // other trips' markers and the titles.
  const overviewAmount = useRef(1);
  // The trip near the globe's centre (focusedTrip), or -1.
  const focused = useRef(-1);
  const front = useRef(new Vector3());
  const inverse = useRef(new Quaternion());
  // The relief this frame, for the lights standing on it.
  const reliefNow = useRef(TRAVEL_CONFIG.physicalRelief);
  // The raised-relief look of an open trip: its progress, linear in time over the focus journey, and eased.
  const focusProgress = useRef(0);
  const focusAmount = useRef(0);
  // The open trip's stops, 0 to 1 (TravelCallouts).
  const stopsAmount = useRef(0);
  // Markers stand on the relief.
  const radiusAt = useCallback((place: LonLat) => {
    if (!elevation) return radius * (1 + trailLift);
    const height = MathUtils.lerp(elevation.heightAt(place), elevation.summaryAt(place), focusAmount.current);
    return radius * (1 + height * reliefNow.current + trailLift);
  }, [elevation, radius, trailLift]);
  const initialized = useRef(false);
  const radiusPx = useRef(1);
  const drag = useRef<{pointerId: number; x: number; y: number; time: number; samples: DragSample[]} | null>(null);
  const reportedFocus = useRef(-2);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const patchLocal = useMemo(() => {
    // The terrain lands on the regional ground's centre when there is one, else where the globe opens (the newest
    // trip), with east and north there. Flat is the globe's turn that lays that tangent frame onto the landscape
    // (plane x is world x, plane y is world -z, both flipped by terrain.vert: east along -x, north along +z, the
    // anchor up).
    const anchor = lonLatToUnit(region ? [region.meta.lon, region.meta.lat] : PLACES[PLACES.length - 1]);
    const east = new Vector3().crossVectors(UP, anchor).normalize();
    const north = new Vector3().crossVectors(anchor, east).normalize();
    const flat = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(new Vector3(-1, 0, 0), new Vector3(0, 0, 1), UP)
        .multiply(new Matrix4().makeBasis(east, north, anchor).transpose()),
    );
    return {anchor, east, north, flat};
  }, [region]);
  // Scratch for placing the globe along the zoom-out; restCamera is the lens the globe was last seen resting from.
  const morphScratch = useRef({
    restCamera: new PerspectiveCamera(), restKnown: false, travel: new Quaternion(), lens: new Quaternion(),
    point: new Vector3(), anchorEnd: new Vector3(), pivot: new Vector3(), normal: new Vector3(),
    start: new Vector3(), startLocal: new Vector3(), endLocal: new Vector3(), ray: new Vector3(),
    // The view the globe's own turn is composed in while on the ride: the resting lens's, not the moving camera's.
    rideView: createGlobeView(),
  });
  // Editing the camera (development): the orbit camera turns and zooms about the globe, not the pose's look-at,
  // and the globe holds still rather than re-aiming the open trip at the camera. Save Camera reads where the
  // trip's marker has ended up on screen and keeps that offset for every trip.
  const controls = useThree((state) => state.controls) as {target?: Vector3} | null;
  useEffect(() => {
    if (editingCamera && visible && controls?.target) controls.target.copy(center);
  }, [center, controls, editingCamera, visible]);
  useEffect(() => {
    if (!measureOffsetRef) return;
    measureOffsetRef.current = () => {
      const group = groupRef.current;
      const camera = getState().camera;
      if (!group || selectedIndex < 0 || !(camera instanceof PerspectiveCamera)) return null;
      const place = TRIPS[selectedIndex].place.lonLat;
      const marker = group.localToWorld(lonLatToUnit(place).multiplyScalar(radiusAt(place)));
      return offsetForMarker(camera, center, radius, marker);
    };
    return () => {
      measureOffsetRef.current = null;
    };
  }, [center, getState, measureOffsetRef, radius, radiusAt, selectedIndex]);
  // The pointer over the sphere, and a drag in progress, show as the cursor.
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const {domElement} = getState().gl;
    domElement.style.cursor = dragging ? 'grabbing' : hovering && visible && interactive ? 'grab' : '';
    return () => {
      domElement.style.cursor = '';
    };
  }, [dragging, getState, hovering, interactive, visible]);

  // Geometry.
  const sphereGeometry = useMemo(() => new SphereGeometry(radius, 256, 128), [radius]);
  const graticuleGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = graticulePositions(graticuleStep);
    for (let index = 0; index < positions.length; index++) positions[index] *= radius * 1.001;
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geometry;
  }, [graticuleStep, radius]);
  const coastGeometry = useMemo(() => {
    if (!coastPositions) return null;
    const geometry = new BufferGeometry();
    const positions = new Float32Array(coastPositions.length);
    for (let index = 0; index < positions.length; index++) positions[index] = coastPositions[index] * radius * 1.002;
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geometry;
  }, [coastPositions, radius]);
  useEffect(() => () => sphereGeometry.dispose(), [sphereGeometry]);
  useEffect(() => () => graticuleGeometry.dispose(), [graticuleGeometry]);
  useEffect(() => () => coastGeometry?.dispose(), [coastGeometry]);

  const shellUniforms = useMemo(() => ({
    uElevation: {value: null as Texture | null},
    uHasElevation: {value: 0},
    uTexel: {value: new Vector2(1 / 2048, 1 / 1024)},
    uRelief: {value: TRAVEL_OVERVIEW_CONFIG.relief},
    uRadius: {value: radius},
    uBaseColor: {value: new Color()},
    uRimColor: {value: new Color()},
    uRimIntensity: {value: 0},
    uLineColor: {value: new Color()},
    uShade: {value: TRAVEL_OVERVIEW_CONFIG.shade},
    uLandTint: {value: TRAVEL_OVERVIEW_CONFIG.landTint},
    uSummary: {value: null as Texture | null},
    uFocus: {value: 0},
    uFocusShade: {value: TRAVEL_TRIP_CONFIG.shade},
    uFocusTint: {value: TRAVEL_TRIP_CONFIG.landTint},
    uVisibility: {value: 1},
    uTerrainDepth: {value: null as DepthTexture | null},
    uTerrainColor: {value: null as Texture | null},
    uUseTerrainDepth: {value: 0},
    uResolution: {value: new Vector2(1, 1)},
    uFogColor: {value: new Color(FOG_CONFIG.color)},
    uFogRange: {value: new Vector2(FOG_CONFIG.near, FOG_CONFIG.far)},
    uFogWeight: {value: 1},
    uRegion: {value: null as Texture | null},
    uHasRegion: {value: 0},
    uRegionTexel: {value: new Vector2(1 / 1024, 1 / 1024)},
    uRegionScale: {value: 1},
    uRegionSlope: {value: TRAVEL_CONFIG.regionSlopeGain},
    uRegionSpread: {value: 1},
    uRegionAnchor: {value: new Vector3(0, 1, 0)},
    uRegionEast: {value: new Vector3(-1, 0, 0)},
    uRegionNorth: {value: new Vector3(0, 0, 1)},
    uRegionHalfAngle: {value: 1},
  }), [radius]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.uniforms.uRegion.value = region?.texture ?? null;
    shell.uniforms.uHasRegion.value = region ? 1 : 0;
    if (!region) return;
    shell.uniforms.uRegionTexel.value.set(1 / region.meta.size, 1 / region.meta.size);
    shell.uniforms.uRegionScale.value = region.meta.maxMetres / TRAVEL_CONFIG.elevationTopMetres;
    // Half the tile's width as an angle at the planet's centre: real ground on a real-sized planet.
    shell.uniforms.uRegionHalfAngle.value = region.meta.km / 2 / EARTH_RADIUS_KM;
  }, [region]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !region) return;
    shell.uniforms.uRegionSpread.value = regionSpread(region.meta.km, region.meta.size, elevation?.texel.x ?? 1);
  }, [elevation, region]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.uniforms.uBaseColor.value.set(baseColor);
    shell.uniforms.uRimColor.value.set(rimColor);
    shell.uniforms.uLineColor.value.set(lineColor);
    shell.uniforms.uShade.value = shade;
    shell.uniforms.uLandTint.value = landTint;
    shell.uniforms.uFocusShade.value = tripShade;
    shell.uniforms.uFocusTint.value = tripTint;
  }, [baseColor, landTint, lineColor, rimColor, shade, tripShade, tripTint]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.uniforms.uElevation.value = elevation?.texture ?? null;
    shell.uniforms.uHasElevation.value = elevation ? 1 : 0;
    shell.uniforms.uSummary.value = elevation?.summary ?? null;
    if (elevation) shell.uniforms.uTexel.value.copy(elevation.texel);
  }, [elevation]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.uniforms.uTerrainDepth.value = terrainDepthTexture;
    shell.uniforms.uTerrainColor.value = terrainColorTexture;
    shell.uniforms.uUseTerrainDepth.value = terrainDepthTexture && terrainColorTexture ? 1 : 0;
  }, [terrainColorTexture, terrainDepthTexture]);
  useEffect(() => {
    graticuleMaterialRef.current?.color.set(lineColor);
    coastMaterialRef.current?.color.set(lineColor);
  }, [coastGeometry, lineColor]);

  // Trails, lights, rings and stars bloom like the contours; the coastlines stay plain lines.
  useEffect(() => {
    const objects: Object3D[] = [...trailMeshes, ...ringLines];
    if (lightPoints) objects.push(lightPoints);
    if (starPoints) objects.push(starPoints);
    onBloomObjects(objects);
  }, [lightPoints, onBloomObjects, ringLines, starPoints, trailMeshes]);
  const handleTrailMeshes = useCallback((meshes: Mesh[]) => setTrailMeshes(meshes), []);
  const handleRingLines = useCallback((lines: LineSegments[]) => setRingLines(lines), []);

  // Pointer drag on the sphere: the surface follows the pointer at the globe's on-screen scale.
  const dragAngle = (pixels: number) => pixels / Math.max(radiusPx.current, 1) * TRAVEL_OVERVIEW_CONFIG.dragGain;
  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (!visible || !interactive || event.button !== 0) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    drag.current = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), samples: [],
    };
    setDragging(true);
  }
  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const now = performance.now();
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    const dt = Math.max(now - current.time, 1) / 1000;
    const yaw = dragAngle(dx);
    const pitch = dragAngle(dy);
    state.current.yaw += yaw;
    state.current.pitch += pitch;
    current.samples.push({vYaw: yaw / dt, vPitch: pitch / dt, time: now});
    while (current.samples.length && now - current.samples[0].time > RELEASE_WINDOW_MS) current.samples.shift();
    current.x = event.clientX;
    current.y = event.clientY;
    current.time = now;
  }
  function endDrag(event: ThreeEvent<PointerEvent>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    drag.current = null;
    setDragging(false);
    if (reducedMotion || !current.samples.length) {
      releaseGlobe(state.current, 0, 0);
      return;
    }
    const vYaw = current.samples.reduce((sum, sample) => sum + sample.vYaw, 0) / current.samples.length;
    const vPitch = current.samples.reduce((sum, sample) => sum + sample.vPitch, 0) / current.samples.length;
    releaseGlobe(state.current, vYaw, vPitch);
  }

  useFrame(({camera, gl}, delta) => {
    const group = groupRef.current;
    const shell = shellRef.current;
    if (!group || !shell || !(camera instanceof PerspectiveCamera)) return;
    gl.getDrawingBufferSize(shell.uniforms.uResolution.value as Vector2);
    const morph = cameraFrameState.current.travelMorph;
    if (visible) heldSelected.current = selectedIndex;
    const selected = visible ? selectedIndex : heldSelected.current;
    // The globe is there whenever a journey has it as the ground or Travel is open; never faded as a whole.
    group.visible = visible || morph > 0;
    if (frameRef.current) frameRef.current.visible = group.visible;
    // Callouts appear once the globe has arrived; lines and trails come in with altitude, as the fog leaves.
    visibility.current = ease(visibility.current, visible && morph >= 1 ? 1 : 0, FADE_RATE, delta, reducedMotion);
    lod.current = MathUtils.smoothstep(morph, linesFrom, linesTo);
    trailLod.current = MathUtils.smoothstep(morph, TRAVEL_CONFIG.trailsIn[0], TRAVEL_CONFIG.trailsIn[1]);
    // The lights come on at half strength as the landscape recedes and reach full as the globe forms, so their
    // glow does not wash the whole frame while they fill it.
    lightLod.current = 0.5 * MathUtils.smoothstep(morph, TRAVEL_CONFIG.lightsIn[0], TRAVEL_CONFIG.lightsIn[1])
      + 0.5 * lod.current;
    starLod.current = MathUtils.smoothstep(morph, TRAVEL_CONFIG.starsIn[0], TRAVEL_CONFIG.starsIn[1]);
    shell.uniforms.uFogWeight.value = 1 - lod.current;
    // The gold rim is the resting globe's: on the way it would band the planet's horizon.
    shell.uniforms.uRimIntensity.value = rimIntensity * lod.current;
    // A trip open, on the resting globe: the raised-relief look eases in over the camera's focus journey, and out
    // the same way (or as the globe leaves).
    const focusTarget = selected >= 0 && morph >= 1 ? 1 : 0;
    const focusStep = Math.min(delta, 1 / 30) / Math.max(focusSeconds, 1e-3);
    focusProgress.current = reducedMotion ? focusTarget : focusTarget > focusProgress.current
      ? Math.min(focusProgress.current + focusStep, 1) : Math.max(focusProgress.current - focusStep, 0);
    focusAmount.current = MathUtils.smootherstep(focusProgress.current, 0, 1);
    // The open trip's stops come in only as the camera settles on it, and leave the moment it sets off.
    const stopsTarget = selected >= 0 && focusProgress.current >= stopsFrom ? 1 : 0;
    stopsAmount.current = ease(
      stopsAmount.current, stopsTarget, stopsTarget ? FADE_RATE : FADE_RATE * 4, delta, reducedMotion);
    shell.uniforms.uFocus.value = focusAmount.current;
    // The planet's relief is real on the way and takes the overview's map exaggeration as the globe arrives; a
    // trip open eases it to the trip's own.
    shell.uniforms.uRelief.value = MathUtils.lerp(
      TRAVEL_CONFIG.physicalRelief, MathUtils.lerp(relief, tripRelief, focusAmount.current),
      MathUtils.smoothstep(morph, reliefFrom, reliefTo));
    reliefNow.current = shell.uniforms.uRelief.value;
    shell.uniforms.uRegionAnchor.value.copy(patchLocal.anchor);
    shell.uniforms.uRegionEast.value.copy(patchLocal.east);
    shell.uniforms.uRegionNorth.value.copy(patchLocal.north);
    // The fog the planet's ground takes is the scene's, as the zoom-out thins it.
    const sceneFog = getState().scene.fog;
    if (sceneFog && 'near' in sceneFog) shell.uniforms.uFogRange.value.set(sceneFog.near, sceneFog.far);
    const graticuleMaterial = graticuleMaterialRef.current;
    if (graticuleMaterial) graticuleMaterial.opacity = graticuleIntensity * lod.current;
    const coastMaterial = coastMaterialRef.current;
    if (coastMaterial) coastMaterial.opacity = Math.min(coastIntensity, 1) * lod.current;
    if (!group.visible) {
      morphScratch.current.restKnown = false;
      return;
    }

    viewFromCamera(center, camera.position, view.current);
    // A trip open turns to its marker offset; over all trips a captured trip turns to the globe's centre.
    const offset: [number, number] = selected >= 0 ? [offsetX, offsetY] : [0, 0];
    aimForOffset(camera, center, radius, offset, aim.current);
    if (!initialized.current) {
      // Open resting on the route's trip at its framing (a refresh on a trip), or over all trips on the newest.
      const place = selected >= 0 ? selected : PLACES.length - 1;
      const facing = selected >= 0
        ? anglesToward(PLACES[place], aim.current, view.current, maxPitch)
        : facingAngles(PLACES[place], view.current);
      state.current.yaw = facing.yaw;
      state.current.pitch = facing.pitch;
      state.current.target = place;
      initialized.current = true;
    }
    const drawn = projectGlobe(camera, center, radius);
    radiusPx.current = drawn.radiusY * height / 2;
    // The globe's outline on screen, for the trip panel to keep clear of (useTripSheetPlacement): only once the
    // globe has arrived. On the ride the planet is Earth-sized and the panel invisible, and a new outline every
    // frame would have the browser reflow the panel's text around a huge shape each frame.
    if (globeOutlineRef) {
      globeOutlineRef.current = morph >= 1
        ? silhouette(camera, group.position, radius * group.scale.x, width, height, outlineScratch)
        : null;
    }
    if (hoveredIndex >= 0 || hold.current || editingCamera) state.current.idle = 0;
    // Between the overview and a trip the camera moves, and the aim and the turn's frame with it: chasing them, the
    // globe would swing toward where the departing camera sees the trip, then drift back. Instead it turns once,
    // straight to where the arriving camera sees the trip: holding for the first turnFrom of the camera's way, then
    // turning so that most of the way is covered when the camera lands and the rest settles slowly over turnSettle
    // seconds more. A drag (or anything else that ends the turn) lets go where the globe stands.
    const focus = cameraFrameState.current.travelFocus;
    const turn = focusTurn.current;
    const focusPlace = selected >= 0 ? selected
      : state.current.target >= 0 ? state.current.target : state.current.active;
    if (focus >= 0 && focusPlace >= 0 && morph >= 1 && !editingCamera
      && (!turn.active || focus < turn.progress || focusPlace !== turn.place)) {
      // A journey begins, or a new one cuts in: the turn will start from where the globe stands.
      turn.from.copy(group.quaternion);
      turn.place = focusPlace;
      turn.active = true;
      turn.started = false;
      turn.elapsed = 0;
    }
    turn.progress = focus;
    if (turn.active && (drag.current || editingCamera || morph < 1 || focusPlace < 0)) {
      // The place facing the camera now, turned to face it.
      const front = turn.front.copy(camera.position).sub(center).normalize()
        .applyQuaternion(turn.inverse.copy(group.quaternion).invert());
      const facing = facingAngles([Math.atan2(front.x, front.z) / DEG, Math.asin(front.y) / DEG], view.current);
      Object.assign(state.current, {yaw: facing.yaw, pitch: facing.pitch, vYaw: 0, vPitch: 0});
      turn.active = false;
    }
    const turnSeconds = Math.max((1 - turnFrom) * focusSeconds + turnSettle, 1e-3);
    if (turn.active) {
      // The goal is the trip as the arriving camera will see it.
      poseCamera(turn.camera, selected >= 0 ? getTravelTripPose(isMobile) : getCameraPose('travel', isMobile), camera);
      const goalView = viewFromCamera(center, turn.camera.position, turn.view);
      const goalAim = aimForOffset(turn.camera, center, radius, offset, turn.aim);
      const goal = anglesToward(PLACES[focusPlace], goalAim, goalView, maxPitch);
      globeQuaternion(goal.yaw, goal.pitch, goalView, turn.to);
      // Cued at turnFrom of the zoom (or at once if the camera has already landed), the turn runs on its own clock
      // for the rest of the zoom and the settle; eased out, so most of it comes early and its end is slight and slow.
      if (!turn.started && (focus < 0 || focus >= turnFrom)) turn.started = true;
      if (turn.started) turn.elapsed += Math.min(delta, 1 / 30);
      const eased = MathUtils.smoothstep(turn.elapsed / turnSeconds, 0, 1);
      const turned = !turn.started ? 0 : reducedMotion ? 1 : 1 - (1 - eased) * (1 - eased);
      group.quaternion.slerpQuaternions(turn.from, turn.to, turned);
      previousYaw.current = null;
      if (turned >= 1 && focus < 0) {
        // Turned, with the camera arrived: the servo takes over with the trip where it rests.
        Object.assign(state.current, {yaw: goal.yaw, pitch: goal.pitch, vYaw: 0, vPitch: 0, target: focusPlace});
        turn.active = false;
      }
    }
    if (!turn.active) {
      // On the ride the globe's own turn holds still: the servo would chase the trip's marker offset against a
      // camera that moves every frame, turning the planet in jerks under the landscape. Entering a trip from
      // outside Travel, the own turn is set once at the start of the ride (below) to where the arriving camera
      // will see the trip; leaving one, it keeps the trip as framed until the globe is gone.
      const riding = morph > 0 && morph < 1;
      if (!editingCamera && !riding) {
        const feel = selected >= 0 ? tripGlobe : overviewGlobe;
        advanceGlobe(state.current, Math.min(delta, 1 / 30), feel, PLACES, view.current, {
          dragging: drag.current !== null,
          locked: selected,
          aim: aim.current,
          reducedMotion,
        });
      }
      // The own turn is yaw about the axis then pitch about the camera's right: composed in the live view it
      // would turn with the camera along the ride, so the ride keeps the view of the lens the globe rests under.
      globeQuaternion(state.current.yaw, state.current.pitch,
        riding ? morphScratch.current.rideView : view.current, group.quaternion);
    }
    // The rings (with the other markers and the titles) leave as a trip opens; back to all trips they wait until
    // the globe's return turn is about to settle (revealAt of it, or of the camera's way when there is no turn).
    const settling = turn.active
      ? !turn.started || turn.elapsed / turnSeconds < revealAt
      : focus >= 0 && focus < revealAt;
    const revealed = selected < 0 && !settling;
    overviewAmount.current = revealed
      ? ease(overviewAmount.current, 1, REVEAL_RATE, delta, reducedMotion)
      : ease(overviewAmount.current, 0, FADE_RATE * 2, delta, reducedMotion);
    ringLod.current = lod.current * overviewAmount.current;
    // Signed: the rings turn with the hand, faster the faster it turns, and keep drifting the way it last went.
    const yawRate = previousYaw.current === null
      ? 0 : MathUtils.radToDeg(wrapAngle(state.current.yaw - previousYaw.current)) / Math.max(delta, 1e-3);
    previousYaw.current = state.current.yaw;
    if (Math.abs(yawRate) > RING_TURN_BELOW) ringDirection.current = Math.sign(yawRate);
    ringSpin.current = ease(ringSpin.current, ringDirection.current + yawRate * TRAVEL_OVERVIEW_CONFIG.ringDragGain,
      RING_FOLLOW_RATE, delta, reducedMotion);

    const patch = cameraFrameState.current.travelPatch;
    const scratch = morphScratch.current;
    if (morph >= 1) {
      group.position.copy(center);
      group.scale.setScalar(1);
      // Remember the lens the globe rests under, so a journey away zooms out from what was seen.
      scratch.restCamera.copy(camera);
      scratch.restCamera.updateMatrixWorld(true);
      scratch.restKnown = true;
      viewFromCamera(center, camera.position, scratch.rideView);
      cameraFrameState.current.setTravelPatchMetrics({
        radius, scale: 0, relief: 0, lift: relief, seaUnits, datumY, metresPerUnit,
      });
    } else {
      // The zoom-out. The planet's radius falls geometrically from Earth-sized (for the landscape's width) to the
      // globe's; its turn eases from lying flat under the landscape to its own; the terrain and the regional
      // ground ride on it at the matching arc scale, standing above sea level.
      const planet = planetScale(landscapeKm, TERRAIN_MESH_CONFIG.planeSize, radius, morph);
      const radiusNow = planet.radius;
      const scale = planet.scale * (1 - MathUtils.smoothstep(morph, vanish, 1));
      scratch.travel.copy(group.quaternion);
      group.quaternion.copy(patchLocal.flat).slerp(scratch.travel, morph);
      // Ends of the ride: the terrain surface at the overview's point of regard (the pivot, at plane level, lands
      // on the anchor), as the camera now sees it, and the anchor on the resting globe, seen through the lens it
      // rests under. Each is a direction in its camera's own frame (not a screen position: the landscape falls
      // behind a camera that has turned up to the globe, where projection folds over). The start is measured
      // from the live camera, whatever pose set off (Art's as much as the overview's), so the glide below begins
      // exactly where the landscape stands and never pans to meet it.
      const overview = getCameraPose(null, isMobile);
      const planeY = TERRAIN_MESH_CONFIG.position[1];
      scratch.pivot.set(overview.lookAt[0], planeY, overview.lookAt[2]);
      const start = scratch.start.set(overview.lookAt[0], datumY, overview.lookAt[2]);
      scratch.startLocal.copy(start).sub(camera.position)
        .applyQuaternion(scratch.lens.copy(camera.quaternion).invert()).normalize();
      scratch.normal.copy(patchLocal.anchor).applyQuaternion(group.quaternion);
      if (!scratch.restKnown) {
        const destination = selected >= 0 ? getTravelTripPose(isMobile) : getCameraPose('travel', isMobile);
        poseCamera(scratch.restCamera, destination, camera);
        viewFromCamera(center, scratch.restCamera.position, scratch.rideView);
        if (selected >= 0) {
          // Arriving at a trip: the globe's own turn is the trip as that camera will see it, from the first frame
          // of the ride (hidden under the flat planet until the globe forms), so no turn is needed on arrival.
          const restAim = aimForOffset(scratch.restCamera, center, radius, offset, turn.aim);
          const goal = anglesToward(PLACES[selected], restAim, scratch.rideView, maxPitch);
          Object.assign(state.current, {yaw: goal.yaw, pitch: goal.pitch, vYaw: 0, vPitch: 0, target: selected});
        }
      }
      scratch.anchorEnd.copy(center).addScaledVector(
        scratch.point.copy(patchLocal.anchor).applyQuaternion(scratch.travel), radius * (1 + relief));
      scratch.endLocal.copy(scratch.anchorEnd).sub(scratch.restCamera.position)
        .applyQuaternion(scratch.lens.copy(scratch.restCamera.quaternion).invert()).normalize();
      // The camera's height above the planet at either end of the ride: over the flat, Earth-sized planet under
      // the landscape as the camera stands now, and over the resting globe from the lens it rests under. Between
      // them it falls geometrically like the planet's radius. The planet is placed about the camera, so the
      // camera is never inside it: it grows about the landing place while tilting into its own turn, and placed
      // the other way round it would sweep past a camera framing a trip near its limb, close to the globe.
      const flatCentre = scratch.point.copy(start).addScaledVector(UP, -(planet.startRadius + seaUnits));
      const height0 = Math.max(camera.position.distanceTo(flatCentre) - (planet.startRadius + seaUnits), 1e-3);
      const seaRest = seaUnits * radius / planet.startRadius;
      const height1 = Math.max(scratch.restCamera.position.distanceTo(center) - (radius + seaRest), 1e-3);
      const height = height0 * Math.pow(height1 / height0, morph);
      // The surface point's direction eases between the two ends in the live camera's frame, so the zoom-out
      // stays with the view; its distance along that ray is whatever stands the camera that height above the
      // planet whose surface passes through it. At either end it is the end itself: the start as the camera sees
      // it now, the anchor as the resting lens sees it once the camera is there.
      const reach = radiusNow + seaUnits * planet.scale;
      scratch.ray.copy(scratch.startLocal).lerp(scratch.endLocal, morph);
      if (scratch.ray.lengthSq() < 1e-8) scratch.ray.copy(scratch.endLocal);
      scratch.ray.normalize().applyQuaternion(camera.quaternion);
      const along = rideDistance(reach, scratch.ray.dot(scratch.normal), height);
      // The surface at the pivot stands above sea level by the landing place's elevation.
      group.position.copy(camera.position).addScaledVector(scratch.ray, along)
        .addScaledVector(scratch.normal, -reach);
      group.scale.setScalar(radiusNow / radius);
      cameraFrameState.current.setTravelPatchMetrics({
        radius: radiusNow, scale, relief: scale * patchRelief, lift: relief, seaUnits, datumY, metresPerUnit,
      });
    }
    group.updateMatrixWorld();

    // Where the terrain rides, in world space, for terrain.vert.
    patch.anchor.copy(patchLocal.anchor).applyQuaternion(group.quaternion);
    patch.east.copy(patchLocal.east).applyQuaternion(group.quaternion);
    patch.north.copy(patchLocal.north).applyQuaternion(group.quaternion);
    patch.center.copy(group.position);
    patch.pivot.copy(scratch.pivot);

    // The place at the globe's centre as seen, once arrived. Focus is where the globe stands alone: the trip near
    // its centre, over all trips once revealed.
    const arrived = visible && morph >= 1;
    if (arrived) {
      front.current.copy(camera.position).sub(group.position).normalize()
        .applyQuaternion(inverse.current.copy(group.quaternion).invert());
    }
    if (globeFrontRef) {
      if (!arrived) globeFrontRef.current = null;
      else {
        const lon = Math.atan2(front.current.x, front.current.z) / DEG;
        const lat = Math.asin(MathUtils.clamp(front.current.y, -1, 1)) / DEG;
        if (globeFrontRef.current) Object.assign(globeFrontRef.current, {lon, lat});
        else globeFrontRef.current = {lon, lat};
      }
    }
    focused.current = revealed && arrived
      ? focusedTrip(FOCUS_POINTS, front.current, focusWithin, FOCUS_RELEASE, focused.current)
      : -1;
    if (reportedFocus.current !== focused.current) {
      reportedFocus.current = focused.current;
      setFocusedIndex(focused.current);
      onCapture(focused.current >= 0 ? TRIPS[focused.current].id : null);
    }
  }, 0.1);

  const brightIndex = selectedIndex >= 0 ? selectedIndex : focusedIndex;

  return (
    <>
    <group position={centerTuple} ref={groupRef} visible={false}>
      <mesh
        geometry={sphereGeometry}
        onPointerCancel={endDrag}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOut={() => setHovering(false)}
        onPointerOver={() => setHovering(true)}
        onPointerUp={endDrag}
        renderOrder={0}
      >
        <shaderMaterial
          fragmentShader={fragmentShader}
          ref={shellRef}
          transparent
          uniforms={shellUniforms}
          vertexShader={vertexShader}
        />
      </mesh>
      {/* Bloom sees only its own layer: this copy of the sphere, drawn there alone, hides the far side's lights
          and trails from the glow as the shell hides them from the picture. */}
      <mesh geometry={sphereGeometry} ref={(mesh) => mesh?.layers.set(BLOOM_LAYER)} scale={0.995}>
        <meshBasicMaterial colorWrite={false} />
      </mesh>
      <lineSegments geometry={graticuleGeometry} ref={graticuleRef} renderOrder={1}>
        <lineBasicMaterial depthWrite={false} ref={graticuleMaterialRef} transparent />
      </lineSegments>
      {coastGeometry ? (
        <lineSegments geometry={coastGeometry} ref={coastRef} renderOrder={1}>
          <lineBasicMaterial depthWrite={false} ref={coastMaterialRef} transparent />
        </lineSegments>
      ) : null}
      <TravelLights
        color={lineColor}
        density={lightDensity}
        elevation={elevation}
        focusRef={focusAmount}
        lift={trailLift}
        onPoints={setLightPoints}
        radius={radius}
        reliefRef={reliefNow}
        size={isMobile ? lightSize * TRAVEL_CONFIG.phoneLightScale : lightSize}
        terrainDepthTexture={terrainDepthTexture}
        visibilityRef={lightLod}
      />
      <TravelTrails
        brightIndex={brightIndex}
        elevation={elevation}
        focusRef={focusAmount}
        onMeshes={handleTrailMeshes}
        radius={radius}
        reliefRef={reliefNow}
        settings={trailSettings}
        trips={TRIPS}
        visibilityRef={trailLod}
      />
      {visible ? (
        <TravelCallouts
          clusterWithin={isMobile ? phoneClusterWithin : clusterWithin}
          focusedIndex={focusedIndex}
          groupRef={groupRef}
          holdRef={hold}
          hoveredIndex={hoveredIndex}
          onHover={onHover}
          onSelect={onSelect}
          globeRadius={radius}
          markerSize={markerSize}
          overviewRef={overviewAmount}
          stopsShownRef={stopsAmount}
          radiusAt={radiusAt}
          selectedIndex={selectedIndex}
          signalColor={trailColor}
          tripMarkerSize={tripMarkerSize}
          trips={TRIPS}
          visibilityRef={visibility}
        />
      ) : null}
    </group>
    {/* The frame and the sky sit about the resting globe, outside its turn and its ride. */}
    <group position={centerTuple} ref={frameRef} visible={false}>
      <TravelRings
        color={lineColor}
        intensity={TRAVEL_OVERVIEW_CONFIG.ringIntensity}
        onLines={handleRingLines}
        radius={radius}
        rings={TRAVEL_OVERVIEW_CONFIG.rings}
        spinRef={ringSpin}
        tilts={[innerRingTilt, outerRingTilt]}
        visibilityRef={ringLod}
      />
      <TravelStars
        color={lineColor}
        count={TRAVEL_CONFIG.starCount}
        onPoints={setStarPoints}
        radius={TRAVEL_CONFIG.starRadius}
        size={starSize}
        visibilityRef={starLod}
      />
    </group>
    </>
  );
}
