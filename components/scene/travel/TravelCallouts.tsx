// Travel markers, laid out in screen space over the globe (TravelCallouts.css). Over all trips the globe carries
// markers, a trip's title showing beside its marker only while it is hovered here or in the trip index: a diamond
// for a trip at one place, a hex at the start and end of a trip with recorded tracks. Trips nearer each other than
// clusterWithin share one stacked marker at their middle; a click fans it out into a ring of the trips' own markers,
// each tied to the middle by a fine line, all alike (no focus among them), while every other marker fades back and
// the globe holds still; a click elsewhere, Escape, or the cluster turning away folds it. With a
// trip open its stops stand on it as small diamonds, each named while hovered. A trip with stops and no tracks gives
// its own marker over to its stops. Markers stand on the relief but, like the trails, hide
// only behind the globe's body, never behind its relief; near the edge they fade. Sizes come from Leva (markerSize
// per view). The trip near the globe's centre is in focus (TravelGlobe, by where the globe stands, not by its
// capture): its marker, or its cluster's, locks on. With a trip open the others fade out, and come back with the
// rings as the return to all trips settles. Hovering a marker highlights its row in the trip index.
'use client';

import {Html} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {
  Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type RefObject,
} from 'react';
import {Group, Vector3, type Camera} from 'three';
import type {LonLat, Trip} from '@/data/travel';
import {behindGlobe, clusterPlaces, densifyTrack, lonLatToUnit} from '@/lib/scene/travel';
import {TripIcon} from './TripIcon';

export type MarkerState = 'idle' | 'focused' | 'selected';

// Offsets from a stop's marker to its name, on a 4px grid (TravelCallouts.css draws the label 20px tall).
const LABEL_OFFSET_X = 28;
const LABEL_RISE = 22;
const ELBOW = 10;
const LEADER_GAP = 6;
const TITLE_ROW = 20;
const EDGE_FADE = 0.25;
const ROUTE_STEP = 0.25; // degrees
// A cluster's fan: the ring's radius in CSS pixels (wider for more trips) and how fast it opens and folds.
const FAN_RADIUS = 30;
const FAN_RADIUS_PER_TRIP = 4;
const FAN_RATE = 12;
const FAN_QUIET = 0.85; // how far the other markers fade back while a fan is open

const DEG = Math.PI / 180;

type TravelCalloutsProps = {
  trips: readonly Trip[];
  /** The globe's group: markers follow its rotation. */
  groupRef: RefObject<Group | null>;
  /** Distance from the globe's centre to its surface at a place (the relief lifts it). */
  radiusAt: (place: LonLat) => number;
  /** The globe's body, under the relief, globe units. */
  globeRadius: number;
  /** Marker size in CSS pixels over all trips and with a trip open (the route hexes; the diamond follows). */
  markerSize: number;
  tripMarkerSize: number;
  /** Degrees: trips nearer than this share one marker over all trips. */
  clusterWithin: number;
  /** The globe's fade, 0 to 1. */
  visibilityRef: MutableRefObject<number>;
  /** How far all trips are shown, 0 to 1: the other markers and the clusters. */
  overviewRef: MutableRefObject<number>;
  /** How far the open trip's stops are shown, 0 to 1: in as the camera settles on the trip, out as it leaves. */
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

type Route = {start: Vector3; end: Vector3};

type Cluster = {members: number[]; unit: Vector3; place: LonLat};

type ScreenPoint = {x: number; y: number; facing: number; front: boolean};

function stateOf(index: number, selected: number, focused: number): MarkerState {
  if (index === selected) return 'selected';
  if (index === focused) return 'focused';
  return 'idle';
}

function placeOf(unit: Vector3): LonLat {
  return [Math.atan2(unit.x, unit.z) / DEG, Math.asin(Math.min(1, Math.max(-1, unit.y))) / DEG];
}

/** A trip's route as one line through all its recordings, as TravelTrails draws it: its two ends. */
function routeOf(trip: Trip): Route | null {
  const track = densifyTrack((trip.segments ?? []).flat(), ROUTE_STEP);
  return track.length < 2 ? null : {start: track[0], end: track[track.length - 1]};
}

/** Where the n-th of `count` trips sits in a fan, CSS pixels from the middle: evenly round from the top. */
function fanOffset(at: number, count: number) {
  const angle = -Math.PI / 2 + (at / count) * Math.PI * 2;
  const radius = FAN_RADIUS + Math.max(count - 3, 0) * FAN_RADIUS_PER_TRIP;
  return {x: Math.cos(angle) * radius, y: Math.sin(angle) * radius};
}

function Hex({dot}: {dot?: boolean}) {
  return (
    <svg className="travel-route-hex" viewBox="0 0 14 14">
      <polygon points="7,0.8 12.6,4 12.6,10 7,13.2 1.4,10 1.4,4" />
      {dot ? <circle cx="7" cy="7" r="1.6" /> : null}
    </svg>
  );
}

export function TravelCallouts({
  trips, groupRef, radiusAt, globeRadius, markerSize, tripMarkerSize, clusterWithin, visibilityRef, overviewRef,
  stopsShownRef, holdRef, selectedIndex, focusedIndex, hoveredIndex, signalColor, onSelect, onHover,
}: TravelCalloutsProps) {
  const anchorsRef = useRef<Array<HTMLDivElement | null>>([]);
  const endsRef = useRef<Array<HTMLDivElement | null>>([]);
  const clustersRef = useRef<Array<HTMLDivElement | null>>([]);
  const fanLinesRef = useRef<Array<SVGLineElement | null>>([]);
  const stopsRef = useRef<Array<Array<HTMLDivElement | null>>>([]);
  const stopLabelsRef = useRef<Array<Array<HTMLDivElement | null>>>([]);
  const stopLeadersRef = useRef<Array<Array<SVGPolylineElement | null>>>([]);
  const labelsRef = useRef<Array<HTMLDivElement | null>>([]);
  const leadersRef = useRef<Array<SVGPolylineElement | null>>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const size = useThree((state) => state.size);
  const units = useMemo(() => trips.map((trip) => lonLatToUnit(trip.place.lonLat)), [trips]);
  const routes = useMemo(() => trips.map(routeOf), [trips]);
  const stopUnits = useMemo(
    () => trips.map((trip) => (trip.stops ?? []).map((stop) => lonLatToUnit(stop.lonLat))), [trips]);
  const clusters = useMemo<Cluster[]>(() => clusterPlaces(trips.map((trip) => trip.place.lonLat), clusterWithin)
    .filter((members) => members.length > 1)
    .map((members) => {
      const unit = members.reduce((sum, index) => sum.add(units[index]), new Vector3()).normalize();
      return {members, unit, place: placeOf(unit)};
    }), [clusterWithin, trips, units]);
  // Each trip's cluster and its place in the fan, or -1.
  const clusterOf = useMemo(() => {
    const of = trips.map(() => ({cluster: -1, at: -1}));
    clusters.forEach(({members}, cluster) => members.forEach((index, at) => {
      of[index] = {cluster, at};
    }));
    return of;
  }, [clusters, trips]);
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
  // The trip last open: back to all trips its marker stays while the others come back, and its stops leave.
  const lastSelected = useRef(selectedIndex);

  // The fan holds the globe; a click outside it or Escape folds it, and so does opening a trip.
  useEffect(() => {
    holdRef.current = expanded >= 0;
    if (expanded < 0) return;
    const fold = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event.target instanceof Element && event.target.closest('.travel-cluster, .travel-callout-anchor')) return;
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
  if (selectedIndex >= 0 && expanded >= 0) setExpanded(-1);
  if (expanded >= clusters.length) setExpanded(-1);

  // After the globe has turned (TravelGlobe runs at 0.1), place every marker.
  useFrame(({camera}, delta) => {
    const group = groupRef.current;
    const layer = layerRef.current;
    if (!group || !layer) return;
    layer.style.opacity = String(visibilityRef.current);
    group.getWorldPosition(center.current);
    group.worldToLocal(eye.current.copy(camera.position));
    if (selectedIndex >= 0) lastSelected.current = selectedIndex;
    const others = overviewRef.current;
    const fanTarget = expandedRef.current >= 0 ? 1 : 0;
    if (expandedRef.current >= 0) fanCluster.current = expandedRef.current;
    fan.current += (fanTarget - fan.current) * (1 - Math.exp(-FAN_RATE * Math.min(delta, 1 / 30)));
    if (Math.abs(fan.current - fanTarget) < 0.001) fan.current = fanTarget;
    if (fan.current === 0) fanCluster.current = -1;
    // Everything outside the open fan fades back.
    const quiet = 1 - FAN_QUIET * fan.current;

    // A place on the relief to CSS pixels, with how squarely it faces the camera and whether it can be seen.
    const project = (unit: Vector3, viewer: Camera, out: ScreenPoint) => {
      const point = world.current.copy(unit).multiplyScalar(radiusAt(placeOf(unit)));
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
      node.style.transform = `translate3d(${at.x + dx}px, ${at.y + dy}px, 0)`;
      node.style.visibility = shown > 0.01 && at.front ? 'visible' : 'hidden';
      node.style.opacity = String(fadeOf(at.facing) * shown);
    };
    // A name beside a marker at (x, y) on a leader line, shown while `titled`.
    const name = (
      label: HTMLElement | null | undefined, leader: SVGPolylineElement | null | undefined,
      x: number, y: number, titled: boolean, fade: number,
    ) => {
      if (!label || !leader) return;
      const top = y - LABEL_RISE - TITLE_ROW / 2;
      const labelX = x + LABEL_OFFSET_X;
      const row = top + TITLE_ROW / 2;
      label.style.transform = `translate3d(${labelX}px, ${top}px, 0)`;
      label.style.visibility = titled ? 'visible' : 'hidden';
      label.style.opacity = String(fade);
      leader.setAttribute('points', `${x},${y} ${labelX - LEADER_GAP - ELBOW},${row} ${labelX - LEADER_GAP},${row}`);
      leader.style.visibility = titled ? 'visible' : 'hidden';
      leader.style.opacity = String(fade);
    };

    // Clusters over all trips: the stacked marker, or its fan once open. A fan turned away folds.
    clusters.forEach((cluster, index) => {
      const at = project(cluster.unit, camera, middle.current);
      if (expandedRef.current === index && (!at.front || others < 0.5)) setExpanded(-1);
      const open = fanCluster.current === index;
      place(clustersRef.current[index], at, others * (open ? 1 - fan.current : quiet));
      cluster.members.forEach((member, slot) => {
        const line = fanLinesRef.current[member];
        if (!line) return;
        const offset = fanOffset(slot, cluster.members.length);
        const shown = open && at.front ? others * fan.current * fadeOf(at.facing) : 0;
        line.setAttribute('x1', String(at.x));
        line.setAttribute('y1', String(at.y));
        // The line stops short of the marker, clear of its drawing.
        const reach = Math.max(1 - (markerSize * 0.6) / Math.hypot(offset.x, offset.y), 0) * fan.current;
        line.setAttribute('x2', String(at.x + offset.x * reach));
        line.setAttribute('y2', String(at.y + offset.y * reach));
        line.style.visibility = shown > 0.01 ? 'visible' : 'hidden';
        line.style.opacity = String(shown);
      });
    });

    trips.forEach((trip, index) => {
      const anchor = anchorsRef.current[index];
      if (!anchor) return;
      // The open trip's own marker stays (and, back to all trips, until the others are back); the others fade.
      const own = index === selectedIndex || (selectedIndex < 0 && index === lastSelected.current);
      const route = routes[index];
      const {cluster, at: slot} = clusterOf[index];
      // A trip giving its marker over to its stops fades it as they come in.
      const handsOver = !route && Boolean(trip.stops?.length) && own ? 1 - stopsShownRef.current : 1;
      // A clustered trip stands at its own place only while open; over all trips it is its cluster's, or in its fan
      // (back to all trips it leaves at once: lingering, it would sit over the stack and take its clicks).
      const alone = cluster < 0 ? (own ? 1 : others) : index === selectedIndex ? 1 - others : 0;
      const shown = alone * handsOver
        * (own ? 1 : quiet);

      // Where the marker stands this frame, for its title: in a folded cluster, the cluster's middle.
      let at: ScreenPoint;
      let markShown = shown;
      if (route) {
        at = project(route.start, camera, screen.current);
        place(anchor, at, shown);
        place(endsRef.current[index], project(route.end, camera, middle.current), shown);
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
      // Its title, while hovered over all trips.
      const titled = index === hoveredIndex && selectedIndex < 0 && at.front && markShown > 0.01;
      name(labelsRef.current[index], leadersRef.current[index], at.x, at.y, titled, fadeOf(at.facing) * markShown);

      // The open trip's stops, in as the camera settles on it and out as it leaves; the hovered stop is named.
      const stops = trip.stops ?? [];
      const stopShown = own ? stopsShownRef.current : 0;
      stops.forEach((stop, stopIndex) => {
        const point = project(stopUnits[index][stopIndex], camera, middle.current);
        place(stopsRef.current[index]?.[stopIndex], point, stopShown);
        const titled = stop.id === hoveredStop && index === selectedIndex && point.front && stopShown > 0.01;
        name(
          stopLabelsRef.current[index]?.[stopIndex], stopLeadersRef.current[index]?.[stopIndex],
          point.x, point.y, titled, fadeOf(point.facing) * stopShown,
        );
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
        className="travel-callouts"
        ref={layerRef}
        style={{
          '--callout-signal': signalColor,
          '--marker-size': `${markerSize}px`,
          '--marker-size-open': `${tripMarkerSize}px`,
        } as CSSProperties}
      >
        <svg aria-hidden="true" className="travel-callouts-leaders">
          {trips.map((trip, index) => (
            <polyline
              className="travel-callout-leader"
              key={trip.id}
              ref={(node) => {
                leadersRef.current[index] = node;
              }}
            />
          ))}
          {clusters.flatMap(({members}) => members.map((member) => (
            <line
              className="travel-fan-leader"
              key={trips[member].id}
              ref={(node) => {
                fanLinesRef.current[member] = node;
              }}
            />
          )))}
          {trips.map((trip, index) => (trip.stops ?? []).map((stop, stopIndex) => (
            <polyline
              className="travel-callout-leader"
              key={`${trip.id}/${stop.id}`}
              ref={(node) => {
                (stopLeadersRef.current[index] ??= [])[stopIndex] = node;
              }}
            />
          )))}
        </svg>
        {clusters.map(({members}, index) => (
          <div
            aria-hidden="true"
            className="travel-cluster"
            data-hovered={members.includes(hoveredIndex) || undefined}
            data-open={expanded === index || undefined}
            data-state={clusterState(members)}
            key={members.map((member) => trips[member].id).join('+')}
            onClick={() => setExpanded((open) => (open === index ? -1 : index))}
            ref={(node) => {
              clustersRef.current[index] = node;
            }}
          >
            <span className="travel-cluster-count">{members.length}</span>
          </div>
        ))}
        {trips.map((trip, index) => {
          // In an open fan the trips stand alike: none takes the focus.
          const inFan = expanded >= 0 && clusterOf[index].cluster === expanded;
          const state = inFan ? 'idle' : stateOf(index, selectedIndex, focusedIndex);
          const hovered = hoveredIndex === index;
          const route = routes[index];
          return (
            <Fragment key={trip.id}>
              {route ? (
                <div aria-hidden="true" className="travel-route" data-hovered={hovered || undefined} data-state={state}>
                  <div
                    className="travel-route-node"
                    ref={(node) => {
                      endsRef.current[index] = node;
                    }}
                  >
                    <Hex />
                  </div>
                </div>
              ) : null}
              {/* The trip index is the accessible way to every trip; the marker is a pointer target. */}
              <div
                aria-hidden="true"
                className="travel-callout-anchor"
                data-hovered={hovered || undefined}
                data-icon={trip.icon && !route ? true : undefined}
                data-route={route ? true : undefined}
                data-state={state}
                onClick={() => onSelect(trip.id)}
                onPointerEnter={() => onHover(trip.id)}
                onPointerLeave={() => onHover(null)}
                ref={(node) => {
                  anchorsRef.current[index] = node;
                }}
              >
                {route ? (
                  <div className="travel-route-node">
                    <Hex dot />
                  </div>
                ) : (
                  <>
                    {trip.icon ? <TripIcon name={trip.icon} /> : null}
                    <span className="travel-callout-reticle" />
                  </>
                )}
              </div>
              <div
                aria-hidden="true"
                className="travel-callout"
                ref={(node) => {
                  labelsRef.current[index] = node;
                }}
              >
                <span className="travel-callout-title" data-tag="">{trip.title}</span>
              </div>
              {(trip.stops ?? []).map((stop, stopIndex) => (
                <Fragment key={stop.id}>
                  <div
                    aria-hidden="true"
                    className="travel-stop"
                    data-hovered={hoveredStop === stop.id || undefined}
                    onPointerEnter={() => setHoveredStop(stop.id)}
                    onPointerLeave={() => setHoveredStop(null)}
                    ref={(node) => {
                      (stopsRef.current[index] ??= [])[stopIndex] = node;
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="travel-callout"
                    ref={(node) => {
                      (stopLabelsRef.current[index] ??= [])[stopIndex] = node;
                    }}
                  >
                    <span className="travel-callout-title">{stop.name}</span>
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
