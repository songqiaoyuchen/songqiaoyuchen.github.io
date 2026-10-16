// Places markers, laid out in screen space over the globe (PlacesCallouts.css). Over all locations the globe carries
// markers, a location's title showing beside its marker only while it is hovered here or in the location index: a
// diamond for a location at one place; a path (a location with recorded tracks) is marked by its route alone (an unseen
// pointer target half way along it). Locations nearer each other than clusterWithin share one stacked marker at their
// middle; a click fans it out into a ring of the locations' own markers, each tied to the middle by a fine line, all
// alike (no focus among them), while every other marker fades back and the globe holds still; a click elsewhere,
// Escape, or the cluster turning away folds it. With a location open its stops stand on it as small diamonds, each
// named beside it. A location with stops and no tracks gives its own marker over to its stops. Markers stand on the
// relief but, like the trails, hide only behind the globe's body, never behind its relief; near the edge they fade.
// Sizes come from Leva (markerSize per view). The location near the globe's centre is in focus (PlacesGlobe, by where
// the globe stands, not by its capture): its marker, or its cluster's, locks on. With a location open the others fade
// out, and come back with the rings as the return to all locations settles. Hovering a marker highlights its row in the
// location index.
'use client';

import {Html} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {
  Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type RefObject,
} from 'react';
import {Group, Vector3, type Camera} from 'three';
import {isPath, type LonLat, type Location} from '@/data/places';
import {behindGlobe, clusterPlaces, densifyTrack, lonLatToUnit} from '@/lib/scene/places';
import {LocationIcon} from './LocationIcon';

export type MarkerState = 'idle' | 'focused' | 'selected';

// Offsets from a hovered location's marker to its name, on a 4px grid (PlacesCallouts.css draws the label 20px tall).
const LABEL_OFFSET_X = 28;
// A stop's name, always shown, stands just right or left of its diamond where it has room; crowded, it moves out on
// a leader line, on rings NAME_REACH pixels further out, preferring the side away from the other stops (NAME_TURN
// weighs a turn against distance). Names never overlap each other (kept NAME_GAP apart) and stay on screen, clear of
// the nav (NAME_TOP) and, on phones, the location sheet; where they can, they keep off the other diamonds and, within
// NAME_NEAR of another mark, nearer their own stop, and their leaders cross other diamonds only at a cost
// (NAME_CROSS). A name keeps its spot while it has room there and nothing much nearer has opened, and moves at once
// (gliding, it would pass over others); it fades in and out (NAME_RATE).
const STOP_NAME_X = 12;
const NAME_GAP = 4;
const NAME_RATE = 10;
const NAME_REACH = [0, 20, 40, 64, 92, 124, 160, 200, 248, 300];
const NAME_TURN = 28;
const NAME_CROSS = 40;
const NAME_NEAR = 24;
const NAME_TOP = 64;
const NAME_EDGE = 8;
const NAME_DIRECTIONS = Array.from({length: 16}, (_, at) => ({
  x: Math.cos((at * Math.PI) / 8), y: Math.sin((at * Math.PI) / 8),
}));
// Phones (the CSS breakpoint, 48rem): the location's sheet covers the lower screen, so names stay above it.
const PHONE_WIDTH = 768;
const LABEL_RISE = 22;
const ELBOW = 10;
const LEADER_GAP = 6;
const TITLE_ROW = 20;
const EDGE_FADE = 0.25;
const ROUTE_STEP = 0.25; // degrees
// A cluster's fan: the ring's radius in CSS pixels (wider for more locations) and how fast it opens and folds.
const FAN_RADIUS = 30;
const FAN_RADIUS_PER_LOCATION = 4;
const FAN_RATE = 12;
const FAN_QUIET = 0.85; // how far the other markers fade back while a fan is open

const DEG = Math.PI / 180;

type PlacesCalloutsProps = {
  locations: readonly Location[];
  /** The globe's group: markers follow its rotation. */
  groupRef: RefObject<Group | null>;
  /** Where a place (unit direction) stands on the drawn surface, globe local: the relief lifts, the lens moves it. */
  surfaceAt: (unit: Vector3, out: Vector3) => Vector3;
  /** The globe's body, under the relief, globe units. */
  globeRadius: number;
  /** Marker size in CSS pixels over all locations and with a location open (the route hexes; the diamond follows). */
  markerSize: number;
  locationMarkerSize: number;
  /** Degrees: locations nearer than this share one marker over all locations. */
  clusterWithin: number;
  /** The globe's fade, 0 to 1. */
  visibilityRef: MutableRefObject<number>;
  /** How far all locations are shown, 0 to 1: the other markers and the clusters. */
  overviewRef: MutableRefObject<number>;
  /** How far the open location's stops are shown, 0 to 1: in as the camera settles on it, out as it leaves. */
  stopsShownRef: MutableRefObject<number>;
  /** Set while a cluster is fanned out: the globe holds still. */
  holdRef: MutableRefObject<boolean>;
  selectedIndex: number;
  focusedIndex: number;
  hoveredIndex: number;
  signalColor: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

type Route = {middle: Vector3};

type Cluster = {members: number[]; unit: Vector3; place: LonLat};

type ScreenPoint = {x: number; y: number; facing: number; front: boolean};

/**
 * A stop name's width (measured once per viewport size), its spot (an index into its candidates, -1 for none),
 * where its box's top left and its leader's end stand from the stop, and how far it is shown, 0 to 1.
 */
type NameLayout = {width: number; spot: number; dx: number; dy: number; ax: number; ay: number; shown: number};

type Box = {left: number; right: number; top: number; bottom: number};

/** A place a stop's name may stand: its box, its leader's end beside the box, and its cost. */
type NameSpot = {box: Box; ax: number; ay: number; cost: number};

const pad = (box: Box): Box => ({
  left: box.left - NAME_GAP, right: box.right + NAME_GAP, top: box.top - NAME_GAP, bottom: box.bottom + NAME_GAP,
});

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** How far a point stands from a box, 0 inside it. */
const distanceTo = (box: Box, x: number, y: number) => Math.hypot(
  Math.max(box.left - x, 0, x - box.right), Math.max(box.top - y, 0, y - box.bottom));

/** Whether the segment from (x1, y1) to (x2, y2) passes through a box (sampled every twentieth of its length). */
function crosses(box: Box, x1: number, y1: number, x2: number, y2: number) {
  for (let t = 0.05; t < 1; t += 0.05) {
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (x > box.left && x < box.right && y > box.top && y < box.bottom) return true;
  }
  return false;
}

/**
 * Every place a stop's name may stand: beside its mark (out `clear` pixels), then on a ring of leader lines.
 * `toward` is the way it would rather go, a unit vector.
 */
function nameSpots(x: number, y: number, clear: number, width: number, toward: {x: number; y: number}) {
  const spots: NameSpot[] = [];
  NAME_REACH.forEach((reach) => NAME_DIRECTIONS.forEach((direction) => {
    // Right beside the mark, only to its left or right.
    if (reach === 0 && Math.abs(direction.y) > 0.01) return;
    const ax = x + direction.x * (clear + reach);
    const ay = y + direction.y * (clear + reach);
    const left = direction.x > 0.3 ? ax : direction.x < -0.3 ? ax - width : ax - width / 2;
    const top = direction.y > 0.3 ? ay : direction.y < -0.3 ? ay - TITLE_ROW : ay - TITLE_ROW / 2;
    const turn = 1 - (direction.x * toward.x + direction.y * toward.y);
    const box = {left, right: left + width, top, bottom: top + TITLE_ROW};
    spots.push({box, ax, ay, cost: reach + NAME_TURN * turn});
  }));
  return spots;
}

function stateOf(index: number, selected: number, focused: number): MarkerState {
  if (index === selected) return 'selected';
  if (index === focused) return 'focused';
  return 'idle';
}

function placeOf(unit: Vector3): LonLat {
  return [Math.atan2(unit.x, unit.z) / DEG, Math.asin(Math.min(1, Math.max(-1, unit.y))) / DEG];
}

/**
 * A location's route as one line through all its recordings, as PlacesTrails draws it: the point half way along it,
 * where its unseen pointer target stands (the path itself is its mark).
 */
function routeOf(location: Location): Route | null {
  if (!isPath(location)) return null;
  const track = densifyTrack((location.segments ?? []).flat(), ROUTE_STEP);
  return track.length < 2 ? null : {middle: track[Math.floor(track.length / 2)]};
}

/** Where the n-th of `count` locations sits in a fan, CSS pixels from the middle: evenly round from the top. */
function fanOffset(at: number, count: number) {
  const angle = -Math.PI / 2 + (at / count) * Math.PI * 2;
  const radius = FAN_RADIUS + Math.max(count - 3, 0) * FAN_RADIUS_PER_LOCATION;
  return {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius};
}

// The last values written to a node's style or attributes: each is written again only once it changes, positions
// to a hundredth of a pixel and opacities to a thousandth, so float noise from a resting globe forces no rewrite.
// A hidden node keeps its stale position and opacity until it shows again.
type Written = {x: number; y: number; x2: number; y2: number; visible: boolean | null; opacity: number};

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

function writtenOf(cache: WeakMap<Element, Written>, node: Element) {
  let written = cache.get(node);
  if (!written) {
    written = {x: NaN, y: NaN, x2: NaN, y2: NaN, visible: null, opacity: NaN};
    cache.set(node, written);
  }
  return written;
}

function show(node: HTMLElement | SVGElement, written: Written, visible: boolean) {
  if (written.visible === visible) return;
  node.style.visibility = visible ? 'visible' : 'hidden';
  written.visible = visible;
}

function fade(node: HTMLElement | SVGElement, written: Written, opacity: number) {
  if (written.opacity === opacity) return;
  node.style.opacity = String(opacity);
  written.opacity = opacity;
}

function move(node: HTMLElement, written: Written, x: number, y: number) {
  if (written.x === x && written.y === y) return;
  node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  written.x = x;
  written.y = y;
}

export function PlacesCallouts({
  locations, groupRef, surfaceAt, globeRadius, markerSize, locationMarkerSize, clusterWithin, visibilityRef,
  overviewRef,
  stopsShownRef, holdRef, selectedIndex, focusedIndex, hoveredIndex, signalColor, onSelect, onHover,
}: PlacesCalloutsProps) {
  const anchorsRef = useRef<Array<HTMLDivElement | null>>([]);
  const clustersRef = useRef<Array<HTMLDivElement | null>>([]);
  const fanLinesRef = useRef<Array<SVGLineElement | null>>([]);
  const stopsRef = useRef<Array<Array<HTMLDivElement | null>>>([]);
  const stopLabelsRef = useRef<Array<Array<HTMLDivElement | null>>>([]);
  const stopLeadersRef = useRef<Array<Array<SVGLineElement | null>>>([]);
  const labelsRef = useRef<Array<HTMLDivElement | null>>([]);
  const leadersRef = useRef<Array<SVGPolylineElement | null>>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const size = useThree((state) => state.size);
  const units = useMemo(() => locations.map((location) => lonLatToUnit(location.place.lonLat)), [locations]);
  const routes = useMemo(() => locations.map(routeOf), [locations]);
  const stopUnits = useMemo(
    () => locations.map((location) => (location.stops ?? []).map((stop) => lonLatToUnit(stop.lonLat))), [locations]);
  const clusters = useMemo<Cluster[]>(() => clusterPlaces(locations.map(({place}) => place.lonLat), clusterWithin)
    .filter((members) => members.length > 1)
    .map((members) => {
      const unit = members.reduce((sum, index) => sum.add(units[index]), new Vector3()).normalize();
      return {members, unit, place: placeOf(unit)};
    }), [clusterWithin, locations, units]);
  // Each location's cluster and its place in the fan, or -1.
  const clusterOf = useMemo(() => {
    const of = locations.map(() => ({cluster: -1, at: -1}));
    clusters.forEach(({members}, cluster) => members.forEach((index, at) => {
      of[index] = {cluster, at};
    }));
    return of;
  }, [clusters, locations]);
  const [expanded, setExpanded] = useState(-1);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const fan = useRef(0);
  // The cluster the fan belongs to, kept while it folds.
  const fanCluster = useRef(-1);
  const [hoveredStop, setHoveredStop] = useState<string | null>(null);
  const world = useRef(new Vector3());
  const center = useRef(new Vector3());
  const toCamera = useRef(new Vector3());
  const screen = useRef<ScreenPoint>({x: 0, y: 0, facing: 0, front: false});
  const middle = useRef<ScreenPoint>({x: 0, y: 0, facing: 0, front: false});
  const eye = useRef(new Vector3());
  // The location last open: back to all locations its marker stays while the others come back, and its stops leave.
  const lastSelected = useRef(selectedIndex);
  // What each node was last given (see Written), whether the layer was fully hidden last frame, and which locations'
  // stops are hidden and left alone.
  const written = useRef(new WeakMap<Element, Written>());
  const layerHidden = useRef(false);
  const stopsHidden = useRef<boolean[]>([]);
  const nameLayouts = useRef(new WeakMap<Element, NameLayout>());
  const stopPoints = useRef<ScreenPoint[]>([]);

  // The fan holds the globe; a click outside it or Escape folds it, and so does opening a location.
  useEffect(() => {
    holdRef.current = expanded >= 0;
    if (expanded < 0) return;
    const fold = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event.target instanceof Element && event.target.closest('.places-cluster, .places-callout-anchor')) return;
      setExpanded(-1);
    };
    window.addEventListener('pointerdown', fold, true);
    window.addEventListener('keydown', fold);
    return () => {
      window.removeEventListener('pointerdown', fold, true);
      window.removeEventListener('keydown', fold);
    };
  }, [expanded, holdRef]);
  useEffect(() => () => {
    holdRef.current = false;
  }, [holdRef]);
  // New stop nodes start visible: hide them again on the next frame.
  useEffect(() => {
    stopsHidden.current = [];
  }, [locations]);
  // Names are measured again at a new size: phones hide them, so they measured nothing there.
  useEffect(() => {
    nameLayouts.current = new WeakMap();
  }, [size.width]);
  if (selectedIndex >= 0 && expanded >= 0) setExpanded(-1);
  if (expanded >= clusters.length) setExpanded(-1);

  // After the globe has turned (PlacesGlobe runs at 0.1), place every marker.
  useFrame(({camera}, delta) => {
    const group = groupRef.current;
    const layer = layerRef.current;
    if (!group || !layer) return;
    const cache = written.current;
    fade(layer, writtenOf(cache, layer), round3(visibilityRef.current));
    if (selectedIndex >= 0) lastSelected.current = selectedIndex;
    const others = overviewRef.current;
    const fanTarget = expandedRef.current >= 0 ? 1 : 0;
    if (expandedRef.current >= 0) fanCluster.current = expandedRef.current;
    fan.current += (fanTarget - fan.current) * (1 - Math.exp(-FAN_RATE * Math.min(delta, 1 / 30)));
    if (Math.abs(fan.current - fanTarget) < 0.001) fan.current = fanTarget;
    if (fan.current === 0) fanCluster.current = -1;
    // Everything outside the open fan fades back.
    const quiet = 1 - FAN_QUIET * fan.current;
    // The layer fully hidden (the entry zoom, before the globe arrives) since last frame: the markers were laid out
    // once and nothing of it can be seen, so they wait where they stand.
    const hidden = visibilityRef.current === 0;
    const wasHidden = layerHidden.current;
    layerHidden.current = hidden;
    if (hidden && wasHidden) return;
    group.getWorldPosition(center.current);
    group.worldToLocal(eye.current.copy(camera.position));

    // A place on the relief to CSS pixels, with how squarely it faces the camera and whether it can be seen.
    const project = (unit: Vector3, viewer: Camera, out: ScreenPoint) => {
      const point = surfaceAt(unit, world.current);
      const occluded = behindGlobe(point, eye.current, globeRadius);
      group.localToWorld(point);
      const normal = toCamera.current.copy(point).sub(center.current).normalize();
      out.facing = normal.dot(toCamera.current.copy(viewer.position).sub(point).normalize());
      point.project(viewer);
      out.x = (point.x + 1) * 0.5 * size.width;
      out.y = (1 - point.y) * 0.5 * size.height;
      out.front = point.z < 1 && !occluded;
      return out;
    };
    const fadeOf = (facing: number) => Math.min(1, Math.max(0, facing / EDGE_FADE));
    const place = (node: HTMLElement | null | undefined, at: ScreenPoint, shown: number, dx = 0, dy = 0) => {
      if (!node) return;
      const last = writtenOf(cache, node);
      const visible = shown > 0.01 && at.front;
      show(node, last, visible);
      if (!visible) return;
      move(node, last, round2(at.x + dx), round2(at.y + dy));
      fade(node, last, round3(fadeOf(at.facing) * shown));
    };
    // A name beside a marker at (x, y) on a leader line, shown while `titled`.
    const name = (
      label: HTMLElement | null | undefined, leader: SVGPolylineElement | null | undefined,
      x: number, y: number, titled: boolean, opacity: number,
    ) => {
      if (!label || !leader) return;
      const lastLabel = writtenOf(cache, label);
      const lastLeader = writtenOf(cache, leader);
      show(label, lastLabel, titled);
      show(leader, lastLeader, titled);
      if (!titled) return;
      const px = round2(x);
      const py = round2(y);
      const top = py - LABEL_RISE - TITLE_ROW / 2;
      const labelX = px + LABEL_OFFSET_X;
      const row = top + TITLE_ROW / 2;
      move(label, lastLabel, labelX, top);
      if (lastLeader.x !== px || lastLeader.y !== py) {
        leader.setAttribute(
          'points', `${px},${py} ${labelX - LEADER_GAP - ELBOW},${row} ${labelX - LEADER_GAP},${row}`);
        lastLeader.x = px;
        lastLeader.y = py;
      }
      const level = round3(opacity);
      fade(label, lastLabel, level);
      fade(leader, lastLeader, level);
    };
    // A stop's marker and name, hidden; the stop is then left alone until it is shown again.
    const hideStop = (locationIndex: number, stopIndex: number) => {
      const stop = stopsRef.current[locationIndex]?.[stopIndex];
      const label = stopLabelsRef.current[locationIndex]?.[stopIndex];
      const leader = stopLeadersRef.current[locationIndex]?.[stopIndex];
      if (stop) show(stop, writtenOf(cache, stop), false);
      if (leader) show(leader, writtenOf(cache, leader), false);
      if (!label) return;
      show(label, writtenOf(cache, label), false);
      const layout = nameLayouts.current.get(label);
      if (layout) {
        layout.shown = 0;
        layout.spot = -1;
      }
    };

    // Clusters over all locations: the stacked marker, or its fan once open. A fan turned away folds.
    clusters.forEach((cluster, index) => {
      const at = project(cluster.unit, camera, middle.current);
      if (expandedRef.current === index && (!at.front || others < 0.5)) setExpanded(-1);
      const open = fanCluster.current === index;
      place(clustersRef.current[index], at, others * (open ? 1 - fan.current : quiet));
      cluster.members.forEach((member, slot) => {
        const line = fanLinesRef.current[member];
        if (!line) return;
        const last = writtenOf(cache, line);
        const shown = open && at.front ? others * fan.current * fadeOf(at.facing) : 0;
        show(line, last, shown > 0.01);
        if (shown <= 0.01) return;
        const offset = fanOffset(slot, cluster.members.length);
        // The line stops short of the marker, clear of its drawing.
        const reach = Math.max(1 - (markerSize * 0.6) / Math.hypot(offset.x, offset.y), 0) * fan.current;
        const x1 = round2(at.x);
        const y1 = round2(at.y);
        const x2 = round2(at.x + offset.x * reach);
        const y2 = round2(at.y + offset.y * reach);
        if (last.x !== x1 || last.y !== y1) {
          line.setAttribute('x1', String(x1));
          line.setAttribute('y1', String(y1));
          last.x = x1;
          last.y = y1;
        }
        if (last.x2 !== x2 || last.y2 !== y2) {
          line.setAttribute('x2', String(x2));
          line.setAttribute('y2', String(y2));
          last.x2 = x2;
          last.y2 = y2;
        }
        fade(line, last, round3(shown));
      });
    });

    locations.forEach((location, index) => {
      const anchor = anchorsRef.current[index];
      if (!anchor) return;
      // The open location's own marker stays (and, back to all locations, until the others are back); the others fade.
      const own = index === selectedIndex || (selectedIndex < 0 && index === lastSelected.current);
      const route = routes[index];
      const {cluster, at: slot} = clusterOf[index];
      // A location giving its marker over to its stops fades it as they come in.
      const handsOver = !route && Boolean(location.stops?.length) && own ? 1 - stopsShownRef.current : 1;
      // A clustered location stands at its own place only while open; over all locations it is its cluster's, or in its
      // fan (back to all locations it leaves at once: lingering, it would sit over the stack and take its clicks).
      const alone = cluster < 0 ? (own ? 1 : others) : index === selectedIndex ? 1 - others : 0;
      const shown = alone * handsOver
        * (own ? 1 : quiet);

      // Where the marker stands this frame, for its title: in a folded cluster, the cluster's middle.
      let at: ScreenPoint;
      let markShown = shown;
      if (route) {
        at = project(route.middle, camera, screen.current);
        place(anchor, at, shown);
      } else if (cluster >= 0 && shown <= 0.01) {
        // In the fan: about the cluster's middle, as far out as it has opened.
        at = project(clusters[cluster].unit, camera, screen.current);
        const offset = fanOffset(slot, clusters[cluster].members.length);
        const fanned = fanCluster.current === cluster ? others * fan.current : 0;
        place(anchor, at, fanned, offset.x * fan.current, offset.y * fan.current);
        if (fanCluster.current === cluster) {
          at.x += offset.x * fan.current;
          at.y += offset.y * fan.current;
        }
        markShown = fanCluster.current === cluster ? others : others * quiet;
      } else {
        at = project(units[index], camera, screen.current);
        place(anchor, at, shown);
      }
      // Its title, while hovered over all locations.
      const titled = index === hoveredIndex && selectedIndex < 0 && at.front && markShown > 0.01;
      name(labelsRef.current[index], leadersRef.current[index], at.x, at.y, titled, fadeOf(at.facing) * markShown);

      // The open location's stops and their names, in as the camera settles on it and out as it leaves.
      // Another location's stops, or the open location's before they come in, are hidden once and left there.
      const stops = location.stops ?? [];
      const stopShown = own ? stopsShownRef.current : 0;
      if (stopShown === 0) {
        if (!stopsHidden.current[index]) {
          stops.forEach((_, stopIndex) => hideStop(index, stopIndex));
          stopsHidden.current[index] = true;
        }
        return;
      }
      stopsHidden.current[index] = false;
      const points = stops.map((_, stopIndex) => project(
        stopUnits[index][stopIndex], camera, stopPoints.current[stopIndex] ??= {x: 0, y: 0, facing: 0, front: false}));
      points.forEach((point, stopIndex) => place(stopsRef.current[index]?.[stopIndex], point, stopShown));

      // Names, in the order visited. A stop's mark, its diamond, and how far out its name starts.
      const markOf = () => locationMarkerSize / 4;
      const nameX = () => STOP_NAME_X;
      const diamonds = points.map((point) => {
        const mark = markOf() + NAME_GAP;
        return {left: point.x - mark, right: point.x + mark, top: point.y - mark, bottom: point.y + mark};
      });
      // The way the stops run on screen (their main axis) and its normal, upward: a crowded name goes out across
      // the line, on the side its stop already stands, else alternately, and out along it as far as the stop stands
      // toward an end (the ends' names go out past them).
      const front = points.filter((point) => point.front);
      const cx = front.reduce((sum, point) => sum + point.x, 0) / Math.max(front.length, 1);
      const cy = front.reduce((sum, point) => sum + point.y, 0) / Math.max(front.length, 1);
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      front.forEach((point) => {
        sxx += (point.x - cx) ** 2;
        syy += (point.y - cy) ** 2;
        sxy += (point.x - cx) * (point.y - cy);
      });
      const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      const axis = {x: Math.cos(angle), y: Math.sin(angle)};
      const normal = axis.x >= 0 ? {x: axis.y, y: -axis.x} : {x: -axis.y, y: axis.x};
      const reachOf = (point: ScreenPoint) => (point.x - cx) * axis.x + (point.y - cy) * axis.y;
      const span = Math.max(...front.map((point) => Math.abs(reachOf(point))), 1);
      const sheetTop = size.width < PHONE_WIDTH
        ? document.querySelector('.places-sheet')?.getBoundingClientRect().top : undefined;
      const bounds: Box = {
        left: NAME_EDGE, right: size.width - NAME_EDGE, top: NAME_TOP, bottom: (sheetTop ?? size.height) - NAME_EDGE,
      };
      const step = 1 - Math.exp(-NAME_RATE * Math.min(delta, 1 / 30));
      // Each shown name's candidate spots, cost and how readable each is: 2 off the other diamonds and nearer its own
      // stop than any other, 1 only off the other diamonds, 0 neither.
      const candidates = points.map((point, stopIndex) => {
        const label = stopLabelsRef.current[index]?.[stopIndex];
        if (!label || !point.front || fadeOf(point.facing) * stopShown <= 0.01) return null;
        let layout = nameLayouts.current.get(label);
        if (!layout) {
          nameLayouts.current.set(label, layout = {width: NaN, spot: -1, dx: 0, dy: 0, ax: 0, ay: 0, shown: 0});
        }
        if (Number.isNaN(layout.width)) layout.width = label.offsetWidth;
        const across = (point.x - cx) * normal.x + (point.y - cy) * normal.y;
        const along = reachOf(point) / span;
        const side = Math.abs(across) > 8 ? Math.sign(across) : stopIndex % 2 ? -1 : 1;
        const tx = normal.x * side + axis.x * along;
        const ty = normal.y * side + axis.y * along;
        const length = Math.hypot(tx, ty);
        const spots = nameSpots(point.x, point.y, nameX(), layout.width, {x: tx / length, y: ty / length});
        const inside = spots.map(({box}) => box.left >= bounds.left && box.right <= bounds.right
          && box.top >= bounds.top && box.bottom <= bounds.bottom);
        const others = (at: number) => at !== stopIndex && points[at].front;
        const costs = spots.map(({ax, ay, cost}) => cost + (diamonds.some(
          (diamond, at) => others(at) && crosses(diamond, point.x, point.y, ax, ay)) ? NAME_CROSS : 0));
        const readable = spots.map(({box}) => {
          const padded = pad(box);
          if (diamonds.some((diamond, at) => others(at) && overlaps(padded, diamond))) return 0;
          // Near another mark a name must be nearer its own; further off, its leader says whose it is.
          const own = distanceTo(box, point.x, point.y);
          return diamonds.some((_, at) => {
            const other = distanceTo(box, points[at].x, points[at].y);
            return others(at) && other < own + NAME_GAP && other < markOf() + NAME_NEAR;
          }) ? 1 : 2;
        });
        return {point, spots, inside, costs, readable, held: layout.spot};
      });
      // Every name in the order visited takes the cheapest spot with room (on screen, off the names and leaders
      // placed so far, its leader clear of those names), the most readable kind there is down to `least`; it keeps
      // its spot while that is as readable and not much dearer. Returns the spots, -1 where a name found no room.
      const arrange = (least: number) => {
        const taken: Box[] = [];
        const leaders: Array<[number, number, number, number]> = [];
        return candidates.map((candidate) => {
          if (!candidate) return -1;
          const {point, spots, inside, costs, readable, held} = candidate;
          const roomy = ({box, ax, ay}: NameSpot, at: number) => {
            const padded = pad(box);
            return inside[at]
              && !taken.some((other) => overlaps(padded, other) || crosses(other, point.x, point.y, ax, ay))
              && !leaders.some(([x1, y1, x2, y2]) => crosses(padded, x1, y1, x2, y2));
          };
          let best = -1;
          for (let level = 2; level >= least && best < 0; level--) {
            spots.forEach((spot, at) => {
              if (readable[at] >= level && (best < 0 || costs[at] < costs[best]) && roomy(spot, at)) best = at;
            });
          }
          if (best >= 0 && held >= 0 && readable[held] >= readable[best] && costs[held] <= costs[best] + NAME_TURN
            && roomy(spots[held], held)) best = held;
          if (best >= 0) {
            taken.push(pad(spots[best].box));
            leaders.push([point.x, point.y, spots[best].ax, spots[best].ay]);
          }
          return best;
        });
      };
      // Readable names if they all fit so, else plainer ones: every name shown comes first.
      const fits = (chosen: number[]) => chosen.every((spot, at) => spot >= 0 || !candidates[at]);
      let chosen = arrange(2);
      if (!fits(chosen)) chosen = arrange(1);
      if (!fits(chosen)) chosen = arrange(0);
      points.forEach((point, stopIndex) => {
        const label = stopLabelsRef.current[index]?.[stopIndex];
        if (!label) return;
        const candidate = candidates[stopIndex];
        const visible = Boolean(candidate);
        let layout = nameLayouts.current.get(label);
        if (!layout) {
          nameLayouts.current.set(label, layout = {width: NaN, spot: -1, dx: 0, dy: 0, ax: 0, ay: 0, shown: 0});
        }
        if (candidate) {
          layout.spot = chosen[stopIndex];
          if (layout.spot >= 0) {
            const spot = candidate.spots[layout.spot];
            layout.dx = spot.box.left - point.x;
            layout.dy = spot.box.top - point.y;
            layout.ax = spot.ax - point.x;
            layout.ay = spot.ay - point.y;
          }
        }
        const placed = visible && layout.spot >= 0;
        layout.shown += ((placed ? 1 : 0) - layout.shown) * step;
        const shown = stopShown * layout.shown;
        place(label, point, shown, layout.dx, layout.dy);

        // Its leader, from just off the mark to the name, once the name stands out from it.
        const leader = stopLeadersRef.current[index]?.[stopIndex];
        if (!leader) return;
        const last = writtenOf(cache, leader);
        const reach = Math.hypot(layout.ax, layout.ay);
        const clear = markOf() + 2;
        const lit = placed && reach > nameX() + 6 ? fadeOf(point.facing) * shown : 0;
        show(leader, last, lit > 0.01);
        if (lit <= 0.01) return;
        const x1 = round2(point.x + (layout.ax / reach) * clear);
        const y1 = round2(point.y + (layout.ay / reach) * clear);
        const x2 = round2(point.x + layout.ax);
        const y2 = round2(point.y + layout.ay);
        if (last.x !== x1 || last.y !== y1 || last.x2 !== x2 || last.y2 !== y2) {
          leader.setAttribute('x1', String(x1));
          leader.setAttribute('y1', String(y1));
          leader.setAttribute('x2', String(x2));
          leader.setAttribute('y2', String(y2));
          Object.assign(last, {x: x1, y: y1, x2, y2});
        }
        fade(leader, last, round3(lit));
      });
    });
  }, 0.3);

  const clusterState = (members: number[]): MarkerState =>
    members.includes(focusedIndex) ? 'focused' : 'idle';

  return (
    <Html
      // One full-viewport layer; the callouts position themselves.
      calculatePosition={(_, __, viewport) => [viewport.width / 2, viewport.height / 2]}
      fullscreen
      // Html sets the layer's stacking (from its anchor's distance) and hides it when the anchor is behind the
      // camera, but only when its position moves, which ours never does: mounted while the globe still stands as
      // the planet, far below, the layer would stay behind the canvas. Keep it on top; each marker hides itself.
      onOcclude={() => {}}
      style={{pointerEvents: 'none'}}
      zIndexRange={[30, 30]}
    >
      <div
        className="places-callouts"
        ref={layerRef}
        style={{
          '--callout-signal': signalColor,
          '--marker-size': `${markerSize}px`,
          '--marker-size-open': `${locationMarkerSize}px`,
        } as CSSProperties}
      >
        <svg aria-hidden="true" className="places-callouts-leaders">
          {locations.map((location, index) => (
            <polyline
              className="places-callout-leader"
              key={location.id}
              ref={(node) => {
                leadersRef.current[index] = node;
              }}
            />
          ))}
          {clusters.flatMap(({members}) => members.map((member) => (
            <line
              className="places-fan-leader"
              key={locations[member].id}
              ref={(node) => {
                fanLinesRef.current[member] = node;
              }}
            />
          )))}
          {locations.flatMap((location, index) => (location.stops ?? []).map((stop, stopIndex) => (
            <line
              className="places-stop-leader"
              key={`${location.id}/${stop.id}`}
              ref={(node) => {
                (stopLeadersRef.current[index] ??= [])[stopIndex] = node;
              }}
            />
          )))}
        </svg>
        {clusters.map(({members}, index) => (
          <div
            aria-hidden="true"
            className="places-cluster"
            data-hovered={members.includes(hoveredIndex) || undefined}
            data-open={expanded === index || undefined}
            data-state={clusterState(members)}
            key={members.map((member) => locations[member].id).join('+')}
            onClick={() => setExpanded((open) => (open === index ? -1 : index))}
            ref={(node) => {
              clustersRef.current[index] = node;
            }}
          >
            <span className="places-cluster-count">{members.length}</span>
          </div>
        ))}
        {locations.map((location, index) => {
          // In an open fan the locations stand alike: none takes the focus.
          const inFan = expanded >= 0 && clusterOf[index].cluster === expanded;
          const state = inFan ? 'idle' : stateOf(index, selectedIndex, focusedIndex);
          const hovered = hoveredIndex === index;
          const route = routes[index];
          return (
            <Fragment key={location.id}>
              {/* The location index is the accessible way to every location; the marker is a pointer target (a route's
                  is unseen, half way along its path, the path itself its mark). */}
              <div
                aria-hidden="true"
                className="places-callout-anchor"
                data-hovered={hovered || undefined}
                data-icon={location.icon && !route ? true : undefined}
                data-route={route ? true : undefined}
                data-state={state}
                onClick={() => onSelect(location.id)}
                onPointerEnter={() => onHover(location.id)}
                onPointerLeave={() => onHover(null)}
                ref={(node) => {
                  anchorsRef.current[index] = node;
                }}
              >
                {route ? null : (
                  <>
                    {location.icon ? <LocationIcon name={location.icon} /> : null}
                    <span className="places-callout-reticle" />
                  </>
                )}
              </div>
              <div
                aria-hidden="true"
                className="places-callout"
                ref={(node) => {
                  labelsRef.current[index] = node;
                }}
              >
                <span className="places-callout-title" data-tag="">{location.title}</span>
              </div>
              {(location.stops ?? []).map((stop, stopIndex) => (
                <Fragment key={stop.id}>
                  <div
                    aria-hidden="true"
                    className="places-stop"
                    data-hovered={hoveredStop === stop.id || undefined}
                    onPointerEnter={() => setHoveredStop(stop.id)}
                    onPointerLeave={() => setHoveredStop(null)}
                    ref={(node) => {
                      (stopsRef.current[index] ??= [])[stopIndex] = node;
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="places-callout places-stop-name"
                    data-hovered={hoveredStop === stop.id || undefined}
                    ref={(node) => {
                      (stopLabelsRef.current[index] ??= [])[stopIndex] = node;
                    }}
                  >
                    <span className="places-callout-title">{stop.name}</span>
                  </div>
                </Fragment>
              ))}
            </Fragment>
          );
        })}
      </div>
    </Html>
  );
}
