// Travel markers: per trip, a diamond on its place with a leader line to the trip's title, laid out in screen
// space over the globe (TravelCallouts.css). Markers on the far side hide; near the edge they fade. Clicking a
// marker or title opens the trip; hovering highlights it and its row in the trip index.
'use client';

import {Html} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {Fragment, useRef, type CSSProperties, type MutableRefObject, type RefObject} from 'react';
import {Group, Vector3} from 'three';
import {formatTripMeta, type Trip} from '@/data/travel';
import {lonLatToUnit} from '@/lib/scene/travel';

export type MarkerState = 'idle' | 'candidate' | 'active' | 'selected';

// Offsets from the marker, on a 4px grid (TravelCallouts.css draws the label 20px tall, 40px when open).
const LABEL_OFFSET_X = 28;
const LABEL_RISE = 22;
const ELBOW = 10;
const LEADER_GAP = 6;
const TITLE_ROW = 20;
const EDGE_FADE = 0.25;

type TravelCalloutsProps = {
  trips: readonly Trip[];
  /** The globe's group: markers follow its rotation. */
  groupRef: RefObject<Group | null>;
  /** Distance from the globe's centre to its surface at a place (the relief lifts it). */
  radiusAt: (place: Trip['place']['lonLat']) => number;
  /** The globe's fade, 0 to 1. */
  visibilityRef: MutableRefObject<number>;
  selectedIndex: number;
  activeIndex: number;
  candidateIndex: number;
  hoveredIndex: number;
  signalColor: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

function stateOf(index: number, selected: number, active: number, candidate: number): MarkerState {
  if (index === selected) return 'selected';
  if (index === active) return 'active';
  if (index === candidate) return 'candidate';
  return 'idle';
}

export function TravelCallouts({
  trips, groupRef, radiusAt, visibilityRef, selectedIndex, activeIndex, candidateIndex, hoveredIndex, signalColor,
  onSelect, onHover,
}: TravelCalloutsProps) {
  const anchorsRef = useRef<Array<HTMLDivElement | null>>([]);
  const labelsRef = useRef<Array<HTMLDivElement | null>>([]);
  const leadersRef = useRef<Array<SVGPolylineElement | null>>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const size = useThree((state) => state.size);
  const units = useRef(trips.map((trip) => lonLatToUnit(trip.place.lonLat)));
  const world = useRef(new Vector3());
  const center = useRef(new Vector3());
  const toCamera = useRef(new Vector3());

  // After the globe has turned (TravelGlobe runs at 0.1), place every marker.
  useFrame(({camera}) => {
    const group = groupRef.current;
    const layer = layerRef.current;
    if (!group || !layer) return;
    layer.style.opacity = String(visibilityRef.current);
    group.getWorldPosition(center.current);
    trips.forEach((trip, index) => {
      const anchor = anchorsRef.current[index];
      const label = labelsRef.current[index];
      const leader = leadersRef.current[index];
      if (!anchor || !label || !leader) return;
      const point = world.current.copy(units.current[index]).multiplyScalar(radiusAt(trip.place.lonLat));
      group.localToWorld(point);
      const normal = toCamera.current.copy(point).sub(center.current).normalize();
      const facing = normal.dot(toCamera.current.copy(camera.position).sub(point).normalize());
      point.project(camera);
      const x = (point.x + 1) * 0.5 * size.width;
      const y = (1 - point.y) * 0.5 * size.height;
      // With a trip open, only its own marker stays, without its title: the trip panel carries that.
      const shown = facing > 0 && point.z < 1 && (selectedIndex < 0 || index === selectedIndex);
      const titled = shown && selectedIndex < 0;
      const fade = Math.min(1, Math.max(0, facing / EDGE_FADE));
      const top = y - LABEL_RISE - TITLE_ROW / 2;
      const labelX = x + LABEL_OFFSET_X;
      const row = top + TITLE_ROW / 2;
      anchor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      label.style.transform = `translate3d(${labelX}px, ${top}px, 0)`;
      leader.setAttribute('points', `${x},${y} ${labelX - LEADER_GAP - ELBOW},${row} ${labelX - LEADER_GAP},${row}`);
      anchor.style.visibility = shown ? 'visible' : 'hidden';
      label.style.visibility = titled ? 'visible' : 'hidden';
      leader.style.visibility = titled ? 'visible' : 'hidden';
      anchor.style.opacity = String(fade);
      label.style.opacity = String(fade);
      leader.style.opacity = String(fade);
    });
  }, 0.3);

  return (
    <Html
      // One full-viewport layer; the callouts position themselves.
      calculatePosition={(_, __, viewport) => [viewport.width / 2, viewport.height / 2]}
      fullscreen
      // Html hides the whole layer when its anchor (the globe's centre) is behind the camera, but checks only when
      // its position moves, and ours never does: mounted mid-flight, it would stay hidden. Each marker hides itself.
      onOcclude={() => {}}
      style={{pointerEvents: 'none'}}
      zIndexRange={[30, 10]}
    >
      <div className="travel-callouts" ref={layerRef} style={{'--callout-signal': signalColor} as CSSProperties}>
        <svg aria-hidden="true" className="travel-callouts-leaders">
          {trips.map((trip, index) => (
            <polyline
              className="travel-callout-leader"
              data-hovered={hoveredIndex === index || undefined}
              data-state={stateOf(index, selectedIndex, activeIndex, candidateIndex)}
              key={trip.id}
              ref={(node) => {
                leadersRef.current[index] = node;
              }}
            />
          ))}
        </svg>
        {trips.map((trip, index) => {
          const state = stateOf(index, selectedIndex, activeIndex, candidateIndex);
          const hovered = hoveredIndex === index;
          return (
            <Fragment key={trip.id}>
              {/* The title button is the accessible control; the marker is a larger pointer target. */}
              <div
                aria-hidden="true"
                className="travel-callout-anchor"
                data-hovered={hovered || undefined}
                data-state={state}
                onClick={() => onSelect(trip.id)}
                onPointerEnter={() => onHover(trip.id)}
                onPointerLeave={() => onHover(null)}
                ref={(node) => {
                  anchorsRef.current[index] = node;
                }}
              >
                <span className="travel-callout-reticle" />
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
                  <span aria-hidden="true" className="travel-callout-title">{trip.title}</span>
                  <span aria-hidden="true" className="travel-callout-meta">{formatTripMeta(trip)}</span>
                </button>
              </div>
            </Fragment>
          );
        })}
      </div>
    </Html>
  );
}
