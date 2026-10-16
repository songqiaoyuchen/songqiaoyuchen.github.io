// Places globe: a night globe (the dark sphere with a gold rim, land a field of light points, faint graticule and
// coastlines, orbit rings about it and stars behind), with the locations' trails and markers, hung above the terrain's
// centre. The camera parks at the Places pose; the globe itself turns: dragged, it follows the pointer; let go, it
// coasts and settles on the nearest location within reach (lib/scene/places.ts); opening or closing a location, the
// globe turns the location to its marker point alongside the camera's zoom (to the quarter-sphere framing this layer
// publishes, or back to the Places pose): holding at first, then covering most of the way by the time the camera lands,
// the last of it a slight settle. The way in is one zoom-out: the globe begins as the planet under the landscape
// (Earth-sized for the width the landscape stands for, tangent at the camera's point of regard, heights above sea
// level) and shrinks geometrically into place while the terrain and the home contour lines ride on it (terrain.vert,
// contours.vert), the landscape's edge handing its heights to the baked regional tile the globe reads around the
// landing place; this layer places the planet for the frame's morph and publishes the patch frame they need. The lights
// come on as the landscape recedes; the stars, the rim, lines and trails come in with altitude, like map labels. With a
// location open the globe eases into a raised-relief map (globe.frag), the trails, lights and markers riding its
// summarized, heightened ground; a small location is magnified by a conformal zoom of the surface
// (lib/scene/placesLens.ts), the globe keeping its size, and the globe turns the middle of a location's places, not its
// starting place, to the marker point.
'use client';

import {useFrame, useThree, type ThreeEvent} from '@react-three/fiber';
import {useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject} from 'react';
import {
  BufferGeometry, Color, Float32BufferAttribute, Group, LineSegments, MathUtils, Matrix4, Mesh,
  PerspectiveCamera, Points, Quaternion, ShaderMaterial, Sphere, SphereGeometry, Vector2, Vector3,
  type DepthTexture, type Intersection, type Object3D, type Raycaster, type Texture,
} from 'three';
import type {
  PlacesControlValues, PlacesOverviewControlValues, PlacesLocationControlValues,
} from '@/components/scene/controls/useSceneControls';
import {usePlacesScene} from '@/components/places/PlacesSceneContext';
import type {GlobeFront} from '@/components/places/PlacesSceneContext';
import type {GlobeOutline} from '@/components/places/useLocationSheetPlacement';
import {BLOOM_LAYER} from '@/components/scene/effects/IsolatedBloom';
import {
  FOG_CONFIG, getCameraPose, SCENE_LAYOUT_CONFIG, TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG, type CameraPose,
} from '@/config/scene';
import {getPlacesLocationPose} from '@/config/scene/camera';
import {PLACES_CONFIG, PLACES_OVERVIEW_CONFIG, PLACES_LOCATION_CONFIG} from '@/config/scene/places';
import {LOCATIONS, type LonLat} from '@/data/places';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {
  advanceGlobe, aimForOffset, anglesToward, createGlobeState, createGlobeView, densifyTrack, EARTH_RADIUS_KM,
  facingAngles, focusedLocation, globeQuaternion, graticulePositions, lonLatToUnit, offsetForMarker, planetScale,
  projectGlobe, regionSpread,
  releaseGlobe, rideDistance, toGlobeSettings, viewFromCamera, wrapAngle,
  type GlobeAngles, type GlobeProjection, type PlanetScale,
} from '@/lib/scene/places';
import {createLensUniforms, lensRelief, lensWarp, locationLens, type Lens} from '@/lib/scene/placesLens';
import '@/lib/scene/placesLensChunk';
import {useTerrainAssets} from '@/lib/terrain/assets';
import {sampleSurfaceHeight} from '@/lib/terrain/height';
import fragmentShader from '@/shaders/terrain/globe.frag';
import vertexShader from '@/shaders/terrain/globe.vert';
import lineFragmentShader from '@/shaders/terrain/globeLine.frag';
import lineVertexShader from '@/shaders/terrain/globeLine.vert';
import {useCameraFrameState} from '../camera/CameraFrameState';
import '@/lib/scene/landShading';
import {PlacesCallouts} from './PlacesCallouts';
import {PlacesLights} from './PlacesLights';
import {PlacesRings} from './PlacesRings';
import {PlacesStars} from './PlacesStars';
import {PlacesTrails} from './PlacesTrails';
import {useCoastlines} from './useCoastlines';
import {useElevation} from './useElevation';
import {useRegion} from './useRegion';
import {useLocationGround} from './useLocationGround';

const FADE_RATE = 4;
// Back to all locations, the rings, other markers and titles come in more slowly than they leave.
const REVEAL_RATE = 3;
// The rings' spin eases toward the globe's turn this fast, per second; turns slower than RING_TURN_BELOW degrees per
// second (the servo settling, a coast dying out) leave their drift direction as it was.
const RING_FOLLOW_RATE = 10;
const RING_TURN_BELOW = 3;
const FOCUS_RELEASE = 5; // degrees past focusWithin a focused location keeps focus
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
const PLACES = LOCATIONS.map((location) => location.place.lonLat);
// Where each location can be in focus: its place, its stops and anywhere along its route.
const FOCUS_POINTS = LOCATIONS.map((location) => [
  lonLatToUnit(location.place.lonLat), ...(location.stops ?? []).map((stop) => lonLatToUnit(stop.lonLat)),
  ...densifyTrack((location.segments ?? []).flat(), FOCUS_STEP),
]);
const UP = new Vector3(0, 1, 0);
const DEG = Math.PI / 180;
// Scratch for the pointer's ray against the sphere.
const RAY_SPHERE = new Sphere();
const RAY_HIT = new Vector3();
const RAY_SCALE = new Vector3();

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

type PlacesGlobeProps = {
  visible: boolean;
  /** False while the development orbit camera owns the pointer; an open location parks the pointer too. */
  interactive?: boolean;
  /** The development orbit camera is editing the pose: it turns about the globe and the globe holds still. */
  editingCamera?: boolean;
  /** Receives a reader of the open location's marker offset as the camera now draws it (Save Camera keeps it). */
  measureOffsetRef?: MutableRefObject<(() => [number, number] | null) | null>;
  /** Receives the globe's outline on screen (CSS pixels) every frame, for the location panel to keep clear of. */
  globeOutlineRef?: MutableRefObject<GlobeOutline | null>;
  /** Receives the place at the globe's centre as seen every frame, once arrived, for the location index. */
  globeFrontRef?: MutableRefObject<GlobeFront | null>;
  /** The globe as both views draw it, and the zoom-out (PLACES_CONFIG). */
  settings: PlacesControlValues;
  /** All locations: the resting globe's ground and its feel by hand (PLACES_OVERVIEW_CONFIG). */
  overviewSettings: PlacesOverviewControlValues;
  /** A selected location: its framing, journey and raised-relief look (PLACES_LOCATION_CONFIG). */
  locationSettings: PlacesLocationControlValues;
  /** The journey between the overview and a location (CAMERA_JOURNEY_CONFIG.placesFocus); the globe turns over it. */
  focusSeconds: number;
  /** The terrain cache's depth and colour: the morphing terrain hides what lies behind it, fading in at its rim. */
  terrainDepthTexture: DepthTexture | null;
  terrainColorTexture: Texture | null;
  /** Receives the lines and trails for the bloom pass. */
  onBloomObjects: (objects: Object3D[]) => void;
  /** The location the globe rests on or is about to land on, for the location index. */
  onCapture: (id: string | null) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

export function PlacesGlobe({
  visible, interactive: pointerFree = true, editingCamera = false, measureOffsetRef, globeOutlineRef, globeFrontRef,
  settings, overviewSettings, locationSettings, focusSeconds, terrainDepthTexture, terrainColorTexture, onBloomObjects,
  onCapture, onSelect, onHover,
}: PlacesGlobeProps) {
  // The location pinned by the route (null for the overview) and the location under the pointer in the location index
  // or on its marker, read here through the canvas's context bridge so a change re-renders this layer alone.
  const {selectedId, hoveredId} = usePlacesScene();
  const interactive = pointerFree && selectedId === null;
  const {width, height} = useThree((state) => state.size);
  const getState = useThree((state) => state.get);
  const isMobile = width < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const reducedMotion = useReducedMotion();
  const cameraFrameState = useCameraFrameState();
  const groupRef = useRef<Group>(null);
  const frameRef = useRef<Group>(null);
  const sphereRef = useRef<Mesh>(null);
  const shellRef = useRef<ShaderMaterial>(null);
  const graticuleRef = useRef<LineSegments>(null);

  const coastRef = useRef<LineSegments>(null);
  const graticuleMaterialRef = useRef<ShaderMaterial>(null);
  const coastMaterialRef = useRef<ShaderMaterial>(null);
  const [trailMeshes, setTrailMeshes] = useState<Mesh[]>([]);
  const [lightPoints, setLightPoints] = useState<Points | null>(null);
  const [starPoints, setStarPoints] = useState<Points | null>(null);
  const [ringLines, setRingLines] = useState<LineSegments[]>([]);
  const coastPositions = useCoastlines(PLACES_CONFIG.coastSrc);
  const elevation = useElevation(PLACES_CONFIG.elevationSrc, locationSettings.summaryBlur, settings.lightDensity);
  const region = useRegion(PLACES_CONFIG.regionSrc, PLACES_CONFIG.regionMetaSrc);
  const {shellBase} = useTerrainAssets();
  const {radius, center: centerTuple, graticuleStep, trailStep, trailLift} = PLACES_CONFIG;
  const center = useMemo(() => new Vector3(...centerTuple), [centerTuple]);
  const {
    baseColor, rimColor, rimIntensity, lineColor, graticuleIntensity, coastIntensity, trailColor,
    lightSize, lightIntensity, starSize, landscapeKm, linesIn,
  } = settings;
  const {
    relief, landTint, trailRadius, markerSize, clusterWithin, phoneClusterWithin, friction, snapBelow, capture,
    snapRate, idleDrift, idleAfter, focusWithin, innerRingTilt, outerRingTilt,
  } = overviewSettings;
  const {
    markerOffset, phoneMarkerOffset, holdRate, turnFrom, turnSettle, revealAt,
    relief: locationRelief, shade: locationShade, landTint: locationTint, trailRadius: locationTrailRadius,
    markerSize: locationMarkerSize, lensFill, lensMaxZoom, lensMinZoom, lensMargin, lensRelief: lensGain,
  } = locationSettings;
  // Each location's zoom at full, and the place the globe turns to the marker point: the middle of the box about its
  // places (the zoom's centre), so the whole location is framed, not just where it began.
  const lenses = useMemo(() => LOCATIONS.map((location) => locationLens(location, {
    fill: lensFill, maxZoom: lensMaxZoom, minZoom: lensMinZoom, margin: lensMargin,
  })), [lensFill, lensMargin, lensMaxZoom, lensMinZoom]);
  const anchors = useMemo(() => lenses.map((lens) => lens.center), [lenses]);
  // The zoom as drawn this frame, shared by every material it moves: the last open location's, swelling with the
  // location's raised look and going with it.
  const lensUniforms = useMemo(() => createLensUniforms(), []);
  const lensNow = useRef<Lens>({center: new Vector3(0, 0, 1), zoom: 1, relief: 0.5});
  const lensFull = useRef(1);
  const lensPlace = useRef<[number, number]>([0, 0]);
  const {patchRelief, vanish, maxPitch} = PLACES_CONFIG;
  const {stopsFrom} = PLACES_LOCATION_CONFIG;
  const {shade} = PLACES_OVERVIEW_CONFIG;
  // Phones frame a location at the top of the screen, above its sheet.
  const [offsetX, offsetY] = isMobile ? phoneMarkerOffset : markerOffset;
  const [linesFrom, linesTo] = linesIn;
  const [reliefFrom, reliefTo] = PLACES_CONFIG.reliefIn;
  // The planet's datum: the landing place's elevation in landscape units, and the terrain surface at the pivot.
  const {metresPerUnit} = planetScale(landscapeKm, TERRAIN_MESH_CONFIG.planeSize, radius, 0);
  const seaUnits = (region?.meta.anchorMetres ?? 0) / metresPerUnit;
  const overviewPose = getCameraPose(null, isMobile);
  const datumY = useMemo(() => sampleSurfaceHeight(
    shellBase, overviewPose.lookAt[0], overviewPose.lookAt[2],
    TERRAIN_MATERIAL_CONFIG.elevation, TERRAIN_MATERIAL_CONFIG.seaLevel,
  ), [overviewPose.lookAt, shellBase]);
  const trailSettings = useMemo(
    () => ({trailColor, trailRadius, locationTrailRadius, trailLift, trailStep}),
    [trailColor, trailLift, trailRadius, trailStep, locationTrailRadius],
  );
  const selectedIndex = LOCATIONS.findIndex((location) => location.id === selectedId);
  // The last opened location's own ground, fading in once loaded (it may arrive after the location opened).
  const [groundIndex, setGroundIndex] = useState(-1);
  if (selectedIndex >= 0 && selectedIndex !== groundIndex) setGroundIndex(selectedIndex);
  const groundLocation = LOCATIONS[groundIndex];
  const ground = useLocationGround(groundLocation?.id ?? null);
  const groundFade = useRef(0);
  // Leaving Places from a location, the route (and so the selection) changes while the globe is still shrinking away:
  // the globe keeps that location (turned to its marker, its rings gone, its raised look easing out) until it is gone,
  // rather than swinging back to the overview mid-way. Held from the last frame Places was open.
  const heldSelected = useRef(selectedIndex);
  const hoveredIndex = LOCATIONS.findIndex((location) => location.id === hoveredId);
  // Set by the markers while a cluster is fanned out: the globe holds still under it.
  const hold = useRef(false);
  // The servo's feel: the overview's by hand; with a location open only its hold rate turns the globe.
  const overviewGlobe = useMemo(() => toGlobeSettings({
    friction, snapBelow, capture, snapRate, idleDrift, idleAfter, maxPitch,
  }), [capture, friction, idleAfter, idleDrift, maxPitch, snapBelow, snapRate]);
  const locationGlobe = useMemo(() => ({...overviewGlobe, snapRate: holdRate}), [holdRate, overviewGlobe]);

  // Rotation state lives outside React: it changes every frame.
  const state = useRef(createGlobeState());
  const view = useRef(createGlobeView());
  const aim = useRef(new Vector3());
  // Opening or closing a location: the globe's turn to the location, from its orientation when the journey began;
  // started once the zoom cues it, elapsed on its own clock.
  const focusTurn = useRef({
    active: false, started: false, elapsed: 0, place: -1, progress: -1,
    from: new Quaternion(), to: new Quaternion(), inverse: new Quaternion(), front: new Vector3(),
    camera: new PerspectiveCamera(), view: createGlobeView(), aim: new Vector3(),
  });
  // Whether the globe is drawn this frame (group.visible as last set): hidden, the lights, trails, rings and stars
  // skip their per-frame work.
  const shown = useRef(false);
  // Callout opacity (shown once the globe has arrived) and the altitude levels of lines, trails, lights and stars.
  const visibility = useRef(0);
  const lod = useRef(0);
  const trailLod = useRef(0);
  const lightLod = useRef(0);
  const starLod = useRef(0);
  const outlineScratch = useMemo<OutlineScratch>(
    () => ({toCamera: new Vector3(), u: new Vector3(), v: new Vector3(), point: new Vector3(), points: []}), []);
  // The rings: how far in (with the lines, gone while a location is open) and their spin factor from the globe's turn.
  const ringLod = useRef(0);
  const ringSpin = useRef(1);
  const ringDirection = useRef(1);
  const previousYaw = useRef<number | null>(null);
  // 1 over all locations, eased to 0 while a location is open and back only as the return turn settles: the rings, the
  // other locations' markers and the titles.
  const overviewAmount = useRef(1);
  // The location near the globe's centre (focusedLocation), or -1.
  const focused = useRef(-1);
  const front = useRef(new Vector3());
  const inverse = useRef(new Quaternion());
  // The relief this frame, for the lights standing on it.
  const reliefNow = useRef(PLACES_CONFIG.physicalRelief);
  // The raised-relief look of an open location: its progress, linear in time over the focus journey, and eased.
  const focusProgress = useRef(0);
  const focusAmount = useRef(0);
  // The open location's stops, 0 to 1 (PlacesCallouts).
  const stopsAmount = useRef(0);
  // Markers stand on the relief.
  const radiusAt = useCallback((place: LonLat, gain = 1) => {
    if (!elevation) return radius * (1 + trailLift);
    const height = MathUtils.lerp(elevation.heightAt(place), elevation.summaryAt(place), focusAmount.current);
    return radius * (1 + height * reliefNow.current * gain + trailLift);
  }, [elevation, radius, trailLift]);
  // A place (unit direction) as drawn: moved by the lens, standing on the relief there.
  const surfaceAt = useCallback((unit: Vector3, out: Vector3) => {
    const place = lensPlace.current;
    place[0] = Math.atan2(unit.x, unit.z) / DEG;
    place[1] = Math.asin(MathUtils.clamp(unit.y, -1, 1)) / DEG;
    lensWarp(unit, lensNow.current, out);
    return out.multiplyScalar(radiusAt(place, lensRelief(out, lensNow.current)));
  }, [radiusAt]);
  const initialized = useRef(false);
  const radiusPx = useRef(1);
  const drag = useRef<{pointerId: number; x: number; y: number; time: number; samples: DragSample[]} | null>(null);
  const reportedFocus = useRef(-2);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const patchLocal = useMemo(() => {
    // The terrain lands on the regional ground's centre when there is one, else where the globe opens (the newest
    // location), with east and north there. Flat is the globe's turn that lays that tangent frame onto the landscape
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
  // The patch frame last copied into the shell's uniforms.
  const writtenPatch = useRef<typeof patchLocal | null>(null);
  // Scratch for placing the globe along the zoom-out; restCamera is the lens the globe was last seen resting from.
  const morphScratch = useRef({
    restCamera: new PerspectiveCamera(), restKnown: false, places: new Quaternion(), lens: new Quaternion(),
    point: new Vector3(), anchorEnd: new Vector3(), pivot: new Vector3(), normal: new Vector3(),
    start: new Vector3(), startLocal: new Vector3(), endLocal: new Vector3(), ray: new Vector3(),
    // The view the globe's own turn is composed in while on the ride: the resting lens's, not the moving camera's.
    rideView: createGlobeView(),
  });
  // Per-frame scratch: the aim's marker offset, the globe as drawn, the turn's goal, the ride's planet and the
  // patch metrics published, so the frame loop allocates nothing.
  const frameScratch = useRef({
    offset: [0, 0] as [number, number],
    drawn: {x: 0, y: 0, radiusX: 0, radiusY: 0} as GlobeProjection,
    goal: {yaw: 0, pitch: 0} as GlobeAngles,
    planet: {startRadius: 0, radius: 0, scale: 0, metresPerUnit: 0} as PlanetScale,
    metrics: {radius: 0, scale: 0, relief: 0, lift: 0, seaUnits: 0, datumY: 0, metresPerUnit: 0},
  });
  // Editing the camera (development): the orbit camera turns and zooms about the globe, not the pose's look-at,
  // and the globe holds still rather than re-aiming the open location at the camera. Save Camera reads where the
  // location's marker has ended up on screen and keeps that offset for every location.
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
      const marker = group.localToWorld(surfaceAt(lonLatToUnit(anchors[selectedIndex]), new Vector3()));
      return offsetForMarker(camera, center, radius, marker);
    };
    return () => {
      measureOffsetRef.current = null;
    };
  }, [anchors, center, getState, measureOffsetRef, radius, selectedIndex, surfaceAt]);
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
  // While the globe turns by hand, a one-finger swipe over the scene (the canvas and the markers above it) is the
  // globe's: left to the browser it pans, rubber-banding the page, and cancels the drag. Pinch zoom stays the
  // browser's. Only the development orbit camera set this before, so the built site never had it.
  useEffect(() => {
    if (!visible || !interactive) return;
    const {events, gl} = getState();
    const source = (events.connected as HTMLElement | undefined) ?? gl.domElement;
    const previous = source.style.touchAction;
    source.style.touchAction = 'pinch-zoom';
    return () => {
      source.style.touchAction = previous;
    };
  }, [getState, interactive, visible]);

  // Geometry.
  const sphereGeometry = useMemo(() => new SphereGeometry(radius, 256, 128), [radius]);
  const graticuleGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    // Sampled every degree: the lens bends the lines between their points.
    const positions = graticulePositions(graticuleStep, 1);
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
  // Graticule and coastlines move with the zoom.
  // The graticule never fades over a location's ground; it shares the coastlines' program, so it says so.
  const graticuleUniforms = useMemo(() => ({
    ...lensUniforms, uColor: {value: new Color()}, uOpacity: {value: 0}, uGroundFade: {value: 0},
  }), [lensUniforms]);
  // The coastlines give way to a zoomed location's own ground, which draws the true coast: they share its frame.
  const coastUniforms = useMemo(() => ({
    ...lensUniforms, uColor: {value: new Color()}, uOpacity: {value: 0}, uGroundFade: {value: 0},
    uGroundAnchor: {value: new Vector3(0, 0, 1)}, uGroundEast: {value: new Vector3(1, 0, 0)},
    uGroundNorth: {value: new Vector3(0, 1, 0)}, uGroundHalfAngle: {value: 1},
  }), [lensUniforms]);

  const shellUniforms = useMemo(() => ({
    ...lensUniforms,
    uElevation: {value: null as Texture | null},
    uHasElevation: {value: 0},
    uTexel: {value: new Vector2(1 / 2048, 1 / 1024)},
    uRelief: {value: PLACES_OVERVIEW_CONFIG.relief},
    uRadius: {value: radius},
    uBaseColor: {value: new Color()},
    uRimColor: {value: new Color()},
    uRimIntensity: {value: 0},
    uLineColor: {value: new Color()},
    uShade: {value: PLACES_OVERVIEW_CONFIG.shade},
    uLandTint: {value: PLACES_OVERVIEW_CONFIG.landTint},
    uSummary: {value: null as Texture | null},
    uFocus: {value: 0},
    uFocusShade: {value: PLACES_LOCATION_CONFIG.shade},
    uFocusTint: {value: PLACES_LOCATION_CONFIG.landTint},
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
    uRegionSlope: {value: PLACES_CONFIG.regionSlopeGain},
    uRegionSpread: {value: 1},
    uRegionAnchor: {value: new Vector3(0, 1, 0)},
    uRegionEast: {value: new Vector3(-1, 0, 0)},
    uRegionNorth: {value: new Vector3(0, 0, 1)},
    uRegionHalfAngle: {value: 1},
    uGround: {value: null as Texture | null},
    uGroundWeight: {value: 0},
    uGroundAnchor: {value: new Vector3(0, 0, 1)},
    uGroundEast: {value: new Vector3(1, 0, 0)},
    uGroundNorth: {value: new Vector3(0, 1, 0)},
    uGroundHalfAngle: {value: 1},
    uGroundSize: {value: 1},
    uGroundSpread: {value: 1},
    uGroundShade: {value: PLACES_LOCATION_CONFIG.groundShade},
  }), [lensUniforms, radius]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.uniforms.uRegion.value = region?.texture ?? null;
    shell.uniforms.uHasRegion.value = region ? 1 : 0;
    if (!region) return;
    shell.uniforms.uRegionTexel.value.set(1 / region.meta.size, 1 / region.meta.size);
    shell.uniforms.uRegionScale.value = region.meta.maxMetres / PLACES_CONFIG.elevationTopMetres;
    // Half the tile's width as an angle at the planet's centre: real ground on a real-sized planet.
    shell.uniforms.uRegionHalfAngle.value = region.meta.km / 2 / EARTH_RADIUS_KM;
  }, [region]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !ground) return;
    // The ground's tangent frame, as the bake laid it out: east = up x centre, north = centre x east.
    const {meta} = ground;
    const anchor = lonLatToUnit([meta.lon, meta.lat]);
    const east = new Vector3().crossVectors(UP, anchor).normalize();
    shell.uniforms.uGround.value = ground.texture;
    shell.uniforms.uGroundAnchor.value.copy(anchor);
    shell.uniforms.uGroundEast.value.copy(east);
    shell.uniforms.uGroundNorth.value.crossVectors(anchor, east);
    shell.uniforms.uGroundHalfAngle.value = meta.km / 2 / EARTH_RADIUS_KM;
    shell.uniforms.uGroundSize.value = meta.size;
    shell.uniforms.uGroundSpread.value = regionSpread(meta.km, meta.size, elevation?.texel.x ?? 1 / 2048);
    const coast = coastMaterialRef.current;
    if (!coast) return;
    coast.uniforms.uGroundAnchor.value.copy(anchor);
    coast.uniforms.uGroundEast.value.copy(east);
    coast.uniforms.uGroundNorth.value.copy(shell.uniforms.uGroundNorth.value);
    coast.uniforms.uGroundHalfAngle.value = shell.uniforms.uGroundHalfAngle.value;
  }, [coastGeometry, elevation, ground]);
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
    shell.uniforms.uFocusShade.value = locationShade;
    shell.uniforms.uFocusTint.value = locationTint;
  }, [baseColor, landTint, lineColor, rimColor, shade, locationShade, locationTint]);
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
    graticuleUniforms.uColor.value.set(lineColor);
    coastUniforms.uColor.value.set(lineColor);
  }, [coastUniforms, graticuleUniforms, lineColor]);

  // Trails, lights, rings and stars bloom like the contours; the coastlines stay plain lines.
  useEffect(() => {
    const objects: Object3D[] = [...trailMeshes, ...ringLines];
    if (lightPoints) objects.push(lightPoints);
    if (starPoints) objects.push(starPoints);
    onBloomObjects(objects);
  }, [lightPoints, onBloomObjects, ringLines, starPoints, trailMeshes]);
  const handleTrailMeshes = useCallback((meshes: Mesh[]) => setTrailMeshes(meshes), []);
  const handleRingLines = useCallback((lines: LineSegments[]) => setRingLines(lines), []);

  // The pointer meets the globe as a sphere, in world space: the relief is the shader's alone, so this is what a
  // test of the sphere's triangles (65k of them, on every pointer move) approximated; the handlers read only the
  // pointer, never the hit point. Hidden (Home, with the globe built in the background) nothing is hit, and as
  // before nothing is hit from inside the sphere, whose faces then look away.
  const raycastGlobe = useCallback((raycaster: Raycaster, intersects: Intersection[]) => {
    const mesh = sphereRef.current;
    if (!mesh || !groupRef.current?.visible) return;
    RAY_SPHERE.center.setFromMatrixPosition(mesh.matrixWorld);
    RAY_SPHERE.radius = radius * RAY_SCALE.setFromMatrixScale(mesh.matrixWorld).x;
    const {ray} = raycaster;
    if (ray.origin.distanceToSquared(RAY_SPHERE.center) < RAY_SPHERE.radius * RAY_SPHERE.radius) return;
    const point = ray.intersectSphere(RAY_SPHERE, RAY_HIT);
    if (!point) return;
    const distance = ray.origin.distanceTo(point);
    if (distance < raycaster.near || distance > raycaster.far) return;
    intersects.push({distance, point: point.clone(), object: mesh});
  }, [radius]);

  // Pointer drag on the sphere: the surface follows the pointer at the globe's on-screen scale.
  const dragAngle = (pixels: number) => pixels / Math.max(radiusPx.current, 1) * PLACES_OVERVIEW_CONFIG.dragGain;
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
  const endDrag = useCallback((event: PointerEvent) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (reducedMotion || !current.samples.length) {
      releaseGlobe(state.current, 0, 0);
      return;
    }
    const vYaw = current.samples.reduce((sum, sample) => sum + sample.vYaw, 0) / current.samples.length;
    const vPitch = current.samples.reduce((sum, sample) => sum + sample.vPitch, 0) / current.samples.length;
    releaseGlobe(state.current, vYaw, vPitch);
  }, [reducedMotion]);
  // The drag ends wherever the pointer is let go or the browser cancels it, read from the window: R3F never passes
  // pointercancel on to the mesh, and a drag left open would hold the globe, and the turn to a location opened next.
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [dragging, endDrag]);

  useFrame(({camera, gl}, delta) => {
    const group = groupRef.current;
    const shell = shellRef.current;
    if (!group || !shell || !(camera instanceof PerspectiveCamera)) return;
    gl.getDrawingBufferSize(shell.uniforms.uResolution.value as Vector2);
    const morph = cameraFrameState.current.placesMorph;
    if (visible) heldSelected.current = selectedIndex;
    const selected = visible ? selectedIndex : heldSelected.current;
    // The globe is there whenever a journey has it as the ground or Places is open; never faded as a whole.
    group.visible = visible || morph > 0;
    shown.current = group.visible;
    if (frameRef.current) frameRef.current.visible = group.visible;
    // Callouts appear once the globe has arrived; lines and trails come in with altitude, as the fog leaves.
    visibility.current = ease(visibility.current, visible && morph >= 1 ? 1 : 0, FADE_RATE, delta, reducedMotion);
    lod.current = MathUtils.smoothstep(morph, linesFrom, linesTo);
    trailLod.current = MathUtils.smoothstep(morph, PLACES_CONFIG.trailsIn[0], PLACES_CONFIG.trailsIn[1]);
    // The lights come on at half strength as the landscape recedes and reach full as the globe forms, so their
    // glow does not wash the whole frame while they fill it.
    lightLod.current = 0.5 * MathUtils.smoothstep(morph, PLACES_CONFIG.lightsIn[0], PLACES_CONFIG.lightsIn[1])
      + 0.5 * lod.current;
    starLod.current = MathUtils.smoothstep(morph, PLACES_CONFIG.starsIn[0], PLACES_CONFIG.starsIn[1]);
    shell.uniforms.uFogWeight.value = 1 - lod.current;
    // The gold rim is the resting globe's: on the way it would band the planet's horizon.
    shell.uniforms.uRimIntensity.value = rimIntensity * lod.current;
    // A location open, on the resting globe: the raised-relief look eases in over the camera's focus journey, and out
    // the same way (or as the globe leaves).
    const focusTarget = selected >= 0 && morph >= 1 ? 1 : 0;
    const focusStep = Math.min(delta, 1 / 30) / Math.max(focusSeconds, 1e-3);
    focusProgress.current = reducedMotion ? focusTarget : focusTarget > focusProgress.current
      ? Math.min(focusProgress.current + focusStep, 1) : Math.max(focusProgress.current - focusStep, 0);
    focusAmount.current = MathUtils.smootherstep(focusProgress.current, 0, 1);
    // The open location's stops come in only as the camera settles on it, and leave the moment it sets off.
    const stopsTarget = selected >= 0 && focusProgress.current >= stopsFrom ? 1 : 0;
    stopsAmount.current = ease(
      stopsAmount.current, stopsTarget, stopsTarget ? FADE_RATE : FADE_RATE * 4, delta, reducedMotion);
    shell.uniforms.uFocus.value = focusAmount.current;
    // The planet's relief is real on the way and takes the overview's map exaggeration as the globe arrives; a
    // location open eases it to the location's own.
    shell.uniforms.uRelief.value = MathUtils.lerp(
      PLACES_CONFIG.physicalRelief, MathUtils.lerp(relief, locationRelief, focusAmount.current),
      MathUtils.smoothstep(morph, reliefFrom, reliefTo));
    reliefNow.current = shell.uniforms.uRelief.value;
    if (writtenPatch.current !== patchLocal) {
      // The tangent frame is constant until the region loads: written once per frame object.
      writtenPatch.current = patchLocal;
      shell.uniforms.uRegionAnchor.value.copy(patchLocal.anchor);
      shell.uniforms.uRegionEast.value.copy(patchLocal.east);
      shell.uniforms.uRegionNorth.value.copy(patchLocal.north);
    }
    // The fog the planet's ground takes is the scene's, as the zoom-out thins it.
    const sceneFog = getState().scene.fog;
    if (sceneFog && 'near' in sceneFog) shell.uniforms.uFogRange.value.set(sceneFog.near, sceneFog.far);
    const graticuleMaterial = graticuleMaterialRef.current;
    if (graticuleMaterial) graticuleMaterial.uniforms.uOpacity.value = graticuleIntensity * lod.current;
    const coastMaterial = coastMaterialRef.current;
    if (coastMaterial) coastMaterial.uniforms.uOpacity.value = Math.min(coastIntensity, 1) * lod.current;
    // The zoom: the open location's (the last one's on the way back to all locations), swelling with the raised look.
    const lens = lensNow.current;
    const lensLocation = selected >= 0 ? lenses[selected] : null;
    if (lensLocation) {
      lonLatToUnit(lensLocation.center, lens.center);
      lensFull.current = lensLocation.zoom;
    }
    lens.zoom = 1 + (lensFull.current - 1) * focusAmount.current;
    // The open (or last) location's own ground, with the zoom.
    const groundReady = ground !== null && ground.id === groundLocation?.id;
    groundFade.current = groundReady ? Math.min(1, groundFade.current
      + Math.min(delta, 1 / 30) / Math.max(PLACES_LOCATION_CONFIG.groundFadeSeconds, 1e-3)) : 0;
    shell.uniforms.uGroundWeight.value = groundFade.current * focusAmount.current;
    if (coastMaterial) coastMaterial.uniforms.uGroundFade.value = shell.uniforms.uGroundWeight.value;
    lens.relief = lensGain;
    // The shell's lens uniforms are the ones every lens material shares.
    shell.uniforms.uLensCenter.value.copy(lens.center);
    shell.uniforms.uLensZoom.value = lens.zoom;
    shell.uniforms.uLensRelief.value = lens.relief;
    if (!group.visible) {
      morphScratch.current.restKnown = false;
      return;
    }

    viewFromCamera(center, camera.position, view.current);
    const frame = frameScratch.current;
    // A location open turns to its marker offset; over all locations a captured location turns to the globe's centre.
    const {offset} = frame;
    offset[0] = selected >= 0 ? offsetX : 0;
    offset[1] = selected >= 0 ? offsetY : 0;
    aimForOffset(camera, center, radius, offset, aim.current);
    if (!initialized.current) {
      // Open resting on the route's location at its framing (a refresh on a location), or over all locations on the
      // newest.
      const place = selected >= 0 ? selected : PLACES.length - 1;
      const facing = selected >= 0
        ? anglesToward(anchors[place], aim.current, view.current, maxPitch)
        : facingAngles(anchors[place], view.current);
      state.current.yaw = facing.yaw;
      state.current.pitch = facing.pitch;
      state.current.target = place;
      initialized.current = true;
    }
    const drawn = projectGlobe(camera, center, radius, frame.drawn);
    radiusPx.current = drawn.radiusY * height / 2;
    // The globe's outline on screen, for the location panel to keep clear of (useLocationSheetPlacement): only once the
    // globe has arrived. On the ride the planet is Earth-sized and the panel invisible, and a new outline every
    // frame would have the browser reflow the panel's text around a huge shape each frame.
    if (globeOutlineRef) {
      globeOutlineRef.current = morph >= 1
        ? silhouette(camera, group.position, radius * group.scale.x, width, height, outlineScratch)
        : null;
    }
    if (hoveredIndex >= 0 || hold.current || editingCamera) state.current.idle = 0;
    // Between the overview and a location the camera moves, and the aim and the turn's frame with it: chasing them, the
    // globe would swing toward where the departing camera sees the location, then drift back. Instead it turns once,
    // straight to where the arriving camera sees the location: holding for the first turnFrom of the camera's way, then
    // turning so that most of the way is covered when the camera lands and the rest settles slowly over turnSettle
    // seconds more. A drag (or anything else that ends the turn) lets go where the globe stands.
    const focus = cameraFrameState.current.placesFocus;
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
      // The goal is the location as the arriving camera will see it.
      const pose = selected >= 0 ? getPlacesLocationPose(isMobile) : getCameraPose('places', isMobile);
      poseCamera(turn.camera, pose, camera);
      const goalView = viewFromCamera(center, turn.camera.position, turn.view);
      const goalAim = aimForOffset(turn.camera, center, radius, offset, turn.aim);
      const goal = anglesToward(anchors[focusPlace], goalAim, goalView, maxPitch, frame.goal);
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
        // Turned, with the camera arrived: the servo takes over with the location where it rests.
        Object.assign(state.current, {yaw: goal.yaw, pitch: goal.pitch, vYaw: 0, vPitch: 0, target: focusPlace});
        turn.active = false;
      }
    }
    if (!turn.active) {
      // On the ride the globe's own turn holds still: the servo would chase the location's marker offset against a
      // camera that moves every frame, turning the planet in jerks under the landscape. Entering a location from
      // outside Places, the own turn is set once at the start of the ride (below) to where the arriving camera
      // will see the location; leaving one, it keeps the location as framed until the globe is gone.
      const riding = morph > 0 && morph < 1;
      if (!editingCamera && !riding) {
        const feel = selected >= 0 ? locationGlobe : overviewGlobe;
        advanceGlobe(state.current, Math.min(delta, 1 / 30), feel, anchors, view.current, {
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
    // The rings (with the other markers and the titles) leave as a location opens; back to all locations they wait
    // until the globe's return turn is about to settle (revealAt of it, or of the camera's way when there is no turn).
    const settling = turn.active
      ? !turn.started || turn.elapsed / turnSeconds < revealAt
      : focus >= 0 && focus < revealAt;
    const revealed = selected < 0 && !settling;
    overviewAmount.current = revealed
      ? ease(overviewAmount.current, 1, REVEAL_RATE, delta, reducedMotion)
      : ease(overviewAmount.current, 0, FADE_RATE * 2, delta, reducedMotion);
    // Signed: the rings turn with the hand, faster the faster it turns, and keep drifting the way it last went.
    const yawRate = previousYaw.current === null
      ? 0 : MathUtils.radToDeg(wrapAngle(state.current.yaw - previousYaw.current)) / Math.max(delta, 1e-3);
    previousYaw.current = state.current.yaw;
    if (Math.abs(yawRate) > RING_TURN_BELOW) ringDirection.current = Math.sign(yawRate);
    ringSpin.current = ease(ringSpin.current, ringDirection.current + yawRate * PLACES_OVERVIEW_CONFIG.ringDragGain,
      RING_FOLLOW_RATE, delta, reducedMotion);

    const patch = cameraFrameState.current.placesPatch;
    const scratch = morphScratch.current;
    const {metrics} = frame;
    metrics.lift = relief;
    metrics.seaUnits = seaUnits;
    metrics.datumY = datumY;
    metrics.metresPerUnit = metresPerUnit;
    if (morph >= 1) {
      group.position.copy(center);
      group.scale.setScalar(1);
      // Remember the lens the globe rests under, so a journey away zooms out from what was seen.
      scratch.restCamera.copy(camera);
      scratch.restCamera.updateMatrixWorld(true);
      scratch.restKnown = true;
      viewFromCamera(center, camera.position, scratch.rideView);
      metrics.radius = radius;
      metrics.scale = 0;
      metrics.relief = 0;
      cameraFrameState.current.setPlacesPatchMetrics(metrics);
    } else {
      // The zoom-out. The planet's radius falls geometrically from Earth-sized (for the landscape's width) to the
      // globe's; its turn eases from lying flat under the landscape to its own; the terrain and the regional
      // ground ride on it at the matching arc scale, standing above sea level.
      const planet = planetScale(landscapeKm, TERRAIN_MESH_CONFIG.planeSize, radius, morph, frame.planet);
      const radiusNow = planet.radius;
      const scale = planet.scale * (1 - MathUtils.smoothstep(morph, vanish, 1));
      scratch.places.copy(group.quaternion);
      group.quaternion.copy(patchLocal.flat).slerp(scratch.places, morph);
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
        const destination = selected >= 0 ? getPlacesLocationPose(isMobile) : getCameraPose('places', isMobile);
        poseCamera(scratch.restCamera, destination, camera);
        viewFromCamera(center, scratch.restCamera.position, scratch.rideView);
        if (selected >= 0) {
          // Arriving at a location: the globe's own turn is the location as that camera will see it, from the first
          // frame of the ride (hidden under the flat planet until the globe forms), so no turn is needed on arrival.
          const restAim = aimForOffset(scratch.restCamera, center, radius, offset, turn.aim);
          const goal = anglesToward(anchors[selected], restAim, scratch.rideView, maxPitch);
          Object.assign(state.current, {yaw: goal.yaw, pitch: goal.pitch, vYaw: 0, vPitch: 0, target: selected});
        }
      }
      scratch.anchorEnd.copy(center).addScaledVector(
        scratch.point.copy(patchLocal.anchor).applyQuaternion(scratch.places), radius * (1 + relief));
      scratch.endLocal.copy(scratch.anchorEnd).sub(scratch.restCamera.position)
        .applyQuaternion(scratch.lens.copy(scratch.restCamera.quaternion).invert()).normalize();
      // The camera's height above the planet at either end of the ride: over the flat, Earth-sized planet under
      // the landscape as the camera stands now, and over the resting globe from the lens it rests under. Between
      // them it falls geometrically like the planet's radius. The planet is placed about the camera, so the
      // camera is never inside it: it grows about the landing place while tilting into its own turn, and placed
      // the other way round it would sweep past a camera framing a location near its limb, close to the globe.
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
      metrics.radius = radiusNow;
      metrics.scale = scale;
      metrics.relief = scale * patchRelief;
      cameraFrameState.current.setPlacesPatchMetrics(metrics);
    }
    group.updateMatrixWorld();
    // The rings stay about the resting globe while the planet grows about the camera, so they go as it outgrows
    // them (ringsRoom of the globe's radius: a sliver of the zoom-out, well inside the lines' window).
    ringLod.current = lod.current * overviewAmount.current
      * (1 - MathUtils.smoothstep(group.scale.x, 1, PLACES_OVERVIEW_CONFIG.ringsRoom));

    // Where the terrain rides, in world space, for terrain.vert.
    patch.anchor.copy(patchLocal.anchor).applyQuaternion(group.quaternion);
    patch.east.copy(patchLocal.east).applyQuaternion(group.quaternion);
    patch.north.copy(patchLocal.north).applyQuaternion(group.quaternion);
    patch.center.copy(group.position);
    patch.pivot.copy(scratch.pivot);

    // The place at the globe's centre as seen, once arrived. Focus is where the globe stands alone: the location near
    // its centre, over all locations once revealed.
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
      ? focusedLocation(FOCUS_POINTS, front.current, focusWithin, FOCUS_RELEASE, focused.current)
      : -1;
    if (reportedFocus.current !== focused.current) {
      reportedFocus.current = focused.current;
      setFocusedIndex(focused.current);
      onCapture(focused.current >= 0 ? LOCATIONS[focused.current].id : null);
    }
  }, 0.1);

  const brightIndex = selectedIndex >= 0 ? selectedIndex : focusedIndex;

  return (
    <>
    <group position={centerTuple} ref={groupRef} visible={false}>
      <mesh
        geometry={sphereGeometry}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOut={() => setHovering(false)}
        onPointerOver={() => setHovering(true)}
        raycast={raycastGlobe}
        ref={sphereRef}
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
        <shaderMaterial
          depthWrite={false}
          fragmentShader={lineFragmentShader}
          ref={graticuleMaterialRef}
          transparent
          uniforms={graticuleUniforms}
          vertexShader={lineVertexShader}
        />
      </lineSegments>
      {coastGeometry ? (
        <lineSegments geometry={coastGeometry} ref={coastRef} renderOrder={1}>
          <shaderMaterial
            depthWrite={false}
            fragmentShader={lineFragmentShader}
            ref={coastMaterialRef}
            transparent
            uniforms={coastUniforms}
            vertexShader={lineVertexShader}
          />
        </lineSegments>
      ) : null}
      <PlacesLights
        color={lineColor}
        elevation={elevation}
        focusRef={focusAmount}
        intensity={lightIntensity}
        lift={trailLift}
        onPoints={setLightPoints}
        radius={radius}
        lensUniforms={lensUniforms}
        reliefRef={reliefNow}
        shownRef={shown}
        size={isMobile ? lightSize * PLACES_CONFIG.phoneLightScale : lightSize}
        terrainDepthTexture={terrainDepthTexture}
        visibilityRef={lightLod}
      />
      <PlacesTrails
        brightIndex={brightIndex}
        elevation={elevation}
        overviewRef={overviewAmount}
        focusRef={focusAmount}
        lensUniforms={lensUniforms}
        onMeshes={handleTrailMeshes}
        radius={radius}
        reliefRef={reliefNow}
        selectedIndex={selectedIndex}
        settings={trailSettings}
        shownRef={shown}
        locations={LOCATIONS}
        visibilityRef={trailLod}
      />
      {visible ? (
        <PlacesCallouts
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
          surfaceAt={surfaceAt}
          selectedIndex={selectedIndex}
          signalColor={trailColor}
          locationMarkerSize={locationMarkerSize}
          locations={LOCATIONS}
          visibilityRef={visibility}
        />
      ) : null}
    </group>
    {/* The frame and the sky sit about the resting globe, outside its turn and its ride. */}
    <group position={centerTuple} ref={frameRef} visible={false}>
      <PlacesRings
        color={lineColor}
        intensity={PLACES_OVERVIEW_CONFIG.ringIntensity}
        onLines={handleRingLines}
        radius={radius}
        rings={PLACES_OVERVIEW_CONFIG.rings}
        shownRef={shown}
        spinRef={ringSpin}
        tilts={[innerRingTilt, outerRingTilt]}
        visibilityRef={ringLod}
      />
      <PlacesStars
        color={lineColor}
        count={PLACES_CONFIG.starCount}
        onPoints={setStarPoints}
        radius={PLACES_CONFIG.starRadius}
        shownRef={shown}
        size={starSize}
        visibilityRef={starLod}
      />
    </group>
    </>
  );
}
