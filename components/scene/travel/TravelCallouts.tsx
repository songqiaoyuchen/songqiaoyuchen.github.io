// Travel markers, laid out in screen space over the globe (TravelCallouts.css). A trip at one place gets a diamond
// with a leader line to its title. A trip with recorded tracks is marked along its route: a hex at the start and
// at the end, and a leader from the route's middle to its title. Over all trips every title takes the same slanted
// tag, its outline lit in focus. Markers stand on the relief but, like the trails, hide only behind the globe's
// body, never behind its relief; near the edge they fade. Sizes come from Leva (markerSize per view). The trip near
// the globe's centre is in focus (TravelGlobe, by where the globe stands, not by its capture): its marker locks on
// and an open cue invites the click. With a trip open the others fade
// out, and come back with the rings as the return to all trips settles. Clicking a marker or title opens the trip;
// hovering highlights it and its row in the trip index.
'use client';

import {Html} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {Fragment, useMemo, useRef, type CSSProperties, type MutableRefObject, type RefObject} from 'react';
import {Group, Vector3, type Camera} from 'three';
import type {LonLat, Trip} from '@/data/travel';
import {behindGlobe, densifyTrack, lonLatToUnit} from '@/lib/scene/travel';

export type MarkerState = 'idle' | 'focused' | 'selected';

// Offsets from the marker, on a 4px grid (TravelCallouts.css draws the label 20px tall).
const LABEL_OFFSET_X = 28;
const LABEL_RISE = 22;
const ELBOW = 10;
const LEADER_GAP = 6;
const TITLE_ROW = 20;
const EDGE_FADE = 0.25;
// Routes: the title stands further off the route's middle, found by distance along samples this far apart.
const ROUTE_LABEL_OFFSET_X = 40;
const ROUTE_LABEL_RISE = 48;
const ROUTE_STEP = 0.25; // degrees

const DEG = Math.PI / 180;

type TravelCalloutsProps = {
  trips: readonly Trip[];
  /** The globe's group: markers follow its rotation. */
  groupRef: RefObject<Group | null>;
  /** Distance from the globe's centre to its surface at a place (the relief lifts it). */
  radiusAt: (place: Trip['place']['lonLat']) => number;
  /** The globe's body, under the relief, globe units. */
  globeRadius: number;
  /** Marker size in CSS pixels over all trips and with a trip open (the route hexes; the diamond follows). */
  markerSize: number;
  tripMarkerSize: number;
  /** The globe's fade, 0 to 1. */
  visibilityRef: MutableRefObject<number>;
  /** How far all trips are shown, 0 to 1: the other markers and the titles. */
  overviewRef: MutableRefObject<number>;
  selectedIndex: number;
  focusedIndex: number;
  hoveredIndex: number;
  signalColor: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

/** A point on a route. */
type Mark = {unit: Vector3; place: LonLat};

type Route = {start: Mark; end: Mark; middle: Mark};

type ScreenPoint = {x: number; y: number; facing: number; front: boolean};

function stateOf(index: number, selected: number, focused: number): MarkerState {
  if (index === selected) return 'selected';
  if (index === focused) return 'focused';
  return 'idle';
}

function placeOf(unit: Vector3): LonLat {
  return [Math.atan2(unit.x, unit.z) / DEG, Math.asin(Math.min(1, Math.max(-1, unit.y))) / DEG];
}

function markOf(unit: Vector3): Mark {
  return {unit, place: placeOf(unit)};
}

/** A trip's route as one line through all its recordings, as TravelTrails draws it. */
function routeOf(trip: Trip): Route | null {
  const track = densifyTrack((trip.segments ?? []).flat(), ROUTE_STEP);
  if (track.length < 2) return null;
  const steps = track.slice(1).map((point, i) => track[i].angleTo(point));
  const half = steps.reduce((sum, step) => sum + step, 0) / 2;
  // Walk to the middle by distance.
  let walked = 0;
  let middle = track[0];
  for (let i = 0; i < steps.length; i++) {
    if (walked + steps[i] >= half) {
      middle = track[i].clone().lerp(track[i + 1], (half - walked) / Math.max(steps[i], 1e-9)).normalize();
      break;
    }
    walked += steps[i];
  }
  return {start: markOf(track[0]), end: markOf(track[track.length - 1]), middle: markOf(middle)};
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
  trips, groupRef, radiusAt, globeRadius, markerSize, tripMarkerSize, visibilityRef, overviewRef, selectedIndex,
  focusedIndex, hoveredIndex, signalColor, onSelect, onHover,
}: TravelCalloutsProps) {
  const anchorsRef = useRef<Array<HTMLDivElement | null>>([]);
  const labelsRef = useRef<Array<HTMLDivElement | null>>([]);
  const leadersRef = useRef<Array<SVGPolylineElement | null>>([]);
  const endsRef = useRef<Array<HTMLDivElement | null>>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const size = useThree((state) => state.size);
  const units = useRef(trips.map((trip) => lonLatToUnit(trip.place.lonLat)));
  const routes = useMemo(() => trips.map(routeOf), [trips]);
  const world = useRef(new Vector3());
  const center = useRef(new Vector3());
  const toCamera = useRef(new Vector3());
  const screen = useRef<ScreenPoint>({x: 0, y: 0, facing: 0, front: false});
  const eye = useRef(new Vector3());
  // The trip last open: back to all trips its marker stays while the others come back.
  const lastSelected = useRef(selectedIndex);

  // After the globe has turned (TravelGlobe runs at 0.1), place every marker.
  useFrame(({camera}) => {
    const group = groupRef.current;
    const layer = layerRef.current;
    if (!group || !layer) return;
    layer.style.opacity = String(visibilityRef.current);
    group.getWorldPosition(center.current);
    group.worldToLocal(eye.current.copy(camera.position));
    if (selectedIndex >= 0) lastSelected.current = selectedIndex;
    const others = overviewRef.current;

    // A place on the relief to CSS pixels, with how squarely it faces the camera and whether it can be seen.
    const project = (unit: Vector3, place: LonLat, viewer: Camera, out: ScreenPoint) => {
      const point = world.current.copy(unit).multiplyScalar(radiusAt(place));
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
    const place = (node: HTMLElement | null | undefined, at: ScreenPoint, shown: number) => {
      if (!node) return;
      node.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;
      node.style.visibility = shown > 0.01 && at.front ? 'visible' : 'hidden';
      node.style.opacity = String(fadeOf(at.facing) * shown);
    };
    const label = (
      index: number, x: number, y: number, front: boolean, facingFade: number, offsetX: number, rise: number,
    ) => {
      const node = labelsRef.current[index];
      const leader = leadersRef.current[index];
      if (!node || !leader) return;
      const top = y - rise - TITLE_ROW / 2;
      const labelX = x + offsetX;
      const row = top + TITLE_ROW / 2;
      // With a trip open no title shows (the trip panel carries it); back to all trips they come with the others.
      const titled = front && selectedIndex < 0 && others > 0.01;
      const fade = facingFade * others;
      node.style.transform = `translate3d(${labelX}px, ${top}px, 0)`;
      node.style.visibility = titled ? 'visible' : 'hidden';
      node.style.opacity = String(fade);
      leader.setAttribute('points', `${x},${y} ${labelX - LEADER_GAP - ELBOW},${row} ${labelX - LEADER_GAP},${row}`);
      leader.style.visibility = titled ? 'visible' : 'hidden';
      leader.style.opacity = String(fade);
    };

    trips.forEach((trip, index) => {
      const anchor = anchorsRef.current[index];
      if (!anchor) return;
      // The open trip's own marker stays (and, back to all trips, until the others are back); the others fade.
      const own = index === selectedIndex || (selectedIndex < 0 && index === lastSelected.current);
      const shown = own ? 1 : others;
      const route = routes[index];

      if (route) {
        place(anchor, project(route.start.unit, route.start.place, camera, screen.current), shown);
        place(endsRef.current[index], project(route.end.unit, route.end.place, camera, screen.current), shown);
        const middle = project(route.middle.unit, route.middle.place, camera, screen.current);
        label(index, middle.x, middle.y, middle.front, fadeOf(middle.facing), ROUTE_LABEL_OFFSET_X, ROUTE_LABEL_RISE);
        return;
      }

      const at = project(units.current[index], trip.place.lonLat, camera, screen.current);
      place(anchor, at, shown);
      label(index, at.x, at.y, at.front, fadeOf(at.facing), LABEL_OFFSET_X, LABEL_RISE);
    });
  }, 0.3);

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
              data-hovered={hoveredIndex === index || undefined}
              data-state={stateOf(index, selectedIndex, focusedIndex)}
              key={trip.id}
              ref={(node) => {
                leadersRef.current[index] = node;
              }}
            />
          ))}
        </svg>
        {trips.map((trip, index) => {
          const state = stateOf(index, selectedIndex, focusedIndex);
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
              {/* The title button is the accessible control; the marker is a larger pointer target. */}
              <div
                aria-hidden="true"
                className="travel-callout-anchor"
                data-hovered={hovered || undefined}
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
                ) : <span className="travel-callout-reticle" />}
              </div>
              <div
                className="travel-callout"
                ref={(node) => {
                  labelsRef.current[index] = node;
                }}
              >
                <button
                  aria-current={state === 'selected' ? 'page' : undefined}
                  aria-label={`${trip.title}: open this trip`}
                  className="travel-callout-label"
                  data-hovered={hovered || undefined}
                  data-state={state}
                  onBlur={() => onHover(null)}
                  onClick={() => onSelect(trip.id)}
                  onFocus={() => onHover(trip.id)}
                  onPointerEnter={() => onHover(trip.id)}
                  onPointerLeave={() => onHover(null)}
                  type="button"
                >
                  <span aria-hidden="true" className="travel-callout-title">
                    {trip.title}
                    <span className="travel-callout-cue">→</span>
                  </span>
                </button>
              </div>
            </Fragment>
          );
        })}
      </div>
    </Html>
  );
}
