// About path callouts: per checkpoint, a diamond marker that locks on when framed and a leader line to the entry's
// title, laid out in screen space over the canvas. Titles stack upward so they never overlap (AboutCallouts.css).
// The same layer sets the map's altitude figures along their contour lines.
'use client';

import {Html} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import {Fragment, useRef, useState, type CSSProperties, type MutableRefObject} from 'react';
import {Vector3} from 'three';
import type {AltitudeMark} from '@/lib/scene/aboutPath';
import {useCameraFrameState} from '../camera/CameraFrameState';

export type CalloutItem = {
  id: string;
  /** The entry's title, as in the drawer timeline. */
  label: string;
  /** Category and start month, shown on the framed checkpoint. */
  meta: string;
  isNext: boolean;
};

export type CalloutState = 'upcoming' | 'active' | 'passed';

// Label heights in px (AboutCallouts.css) and layout offsets from the checkpoint, on a 4px grid.
const LABEL_HEIGHT = {compact: 20, active: 40};
const TITLE_ROW = 20;
const LABEL_OFFSET_X = 36;
const LABEL_RISE = 24;
const LABEL_GAP = 8;
const ELBOW = 12;
const LEADER_GAP = 8;

function getState(index: number, activeStop: number): CalloutState {
  if (index === activeStop) return 'active';
  return index < activeStop ? 'passed' : 'upcoming';
}

type AboutCalloutsProps = {
  items: readonly CalloutItem[];
  marks: readonly AltitudeMark[];
  /** The trail's signal colour, for the markers. */
  signalColor: string;
  stops: readonly Vector3[];
  activeStop: number;
  onSelect: (stop: number) => void;
};

export function AboutCallouts({items, marks, signalColor, stops, activeStop, onSelect}: AboutCalloutsProps) {
  const anchorsRef = useRef<Array<HTMLDivElement | null>>([]);
  const labelsRef = useRef<Array<HTMLDivElement | null>>([]);
  const leadersRef = useRef<Array<SVGPolylineElement | null>>([]);
  const marksRef = useRef<Array<HTMLSpanElement | null>>([]);
  const cameraFrameState = useCameraFrameState();
  const size = useThree((state) => state.size);
  const laidOut = useRef<{revision: number; activeStop: number; width: number; height: number;
    marks: readonly AltitudeMark[] | null;}>({revision: -1, activeStop: -2, width: 0, height: 0, marks: null});
  const projected = useRef(new Vector3());
  const along = useRef(new Vector3());

  useFrame(({camera}) => {
    const last = laidOut.current;
    const {revision} = cameraFrameState.current;
    // Lay out again only when the view, the viewport or the framed checkpoint changes.
    if (last.revision === revision && last.activeStop === activeStop && last.marks === marks
      && last.width === size.width && last.height === size.height) return;
    // The layer mounts in its own React root; wait until every element is attached.
    if (stops.some((_, index) => !anchorsRef.current[index] || !labelsRef.current[index]
      || !leadersRef.current[index]) || marks.some((_, index) => !marksRef.current[index])) return;
    const toScreen = (point: Vector3) => {
      point.project(camera);
      return [(point.x + 1) * 0.5 * size.width, (1 - point.y) * 0.5 * size.height, point.z] as const;
    };

    // Altitude figures follow their contour line, kept upright.
    marks.forEach((mark, index) => {
      const element = marksRef.current[index]!;
      const [x, y, depth] = toScreen(projected.current.copy(mark.position));
      const [ax, ay] = toScreen(along.current.copy(mark.tangent).multiplyScalar(0.12).add(mark.position));
      let angle = Math.atan2(ay - y, ax - x) * 180 / Math.PI;
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg) translate(-50%, -50%)`;
      element.style.visibility = depth < 1 && x > -40 && x < size.width + 40 && y > -40 && y < size.height + 40
        ? 'visible' : 'hidden';
    });

    let ceiling = Infinity; // top of the label below, so labels stack upward
    stops.forEach((stop, index) => {
      const anchor = anchorsRef.current[index]!;
      const label = labelsRef.current[index]!;
      const leader = leadersRef.current[index]!;
      const point = projected.current.copy(stop).project(camera);
      const x = (point.x + 1) * 0.5 * size.width;
      const y = (1 - point.y) * 0.5 * size.height;
      const onScreen = point.z < 1 && x > -40 && x < size.width + 40 && y > -40 && y < size.height + 40;
      const height = index === activeStop ? LABEL_HEIGHT.active : LABEL_HEIGHT.compact;
      let top = y - LABEL_RISE - TITLE_ROW / 2;
      if (top + height + LABEL_GAP > ceiling) top = ceiling - LABEL_GAP - height;
      ceiling = top;
      const labelX = x + LABEL_OFFSET_X;
      const row = top + TITLE_ROW / 2;

      anchor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      label.style.transform = `translate3d(${labelX}px, ${top}px, 0)`;
      leader.setAttribute('points',
        `${x},${y} ${labelX - LEADER_GAP - ELBOW},${row} ${labelX - LEADER_GAP},${row}`);
      const visibility = onScreen ? 'visible' : 'hidden';
      anchor.style.visibility = visibility;
      label.style.visibility = visibility;
      leader.style.visibility = visibility;
    });
    laidOut.current = {revision, activeStop, width: size.width, height: size.height, marks};
  });

  return (
    <Html
      // One full-viewport layer; the callouts position themselves.
      calculatePosition={(_, __, viewport) => [viewport.width / 2, viewport.height / 2]}
      fullscreen
      position={stops.at(-1)?.toArray()}
      style={{pointerEvents: 'none'}}
      zIndexRange={[30, 10]}
    >
      <CalloutLayer
        activeStop={activeStop}
        anchorsRef={anchorsRef}
        items={items}
        labelsRef={labelsRef}
        leadersRef={leadersRef}
        marks={marks}
        marksRef={marksRef}
        signalColor={signalColor}
        onSelect={onSelect}
      />
    </Html>
  );
}

type CalloutLayerProps = {
  items: readonly CalloutItem[];
  marks: readonly AltitudeMark[];
  signalColor: string;
  marksRef: MutableRefObject<Array<HTMLSpanElement | null>>;
  activeStop: number;
  onSelect: (stop: number) => void;
  anchorsRef: MutableRefObject<Array<HTMLDivElement | null>>;
  labelsRef: MutableRefObject<Array<HTMLDivElement | null>>;
  leadersRef: MutableRefObject<Array<SVGPolylineElement | null>>;
};

function CalloutLayer({
  items, marks, signalColor, activeStop, onSelect, anchorsRef, labelsRef, leadersRef, marksRef,
}: CalloutLayerProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="about-callouts" style={{'--callout-signal': signalColor} as CSSProperties}>
      {marks.map((mark, index) => (
        <span
          aria-hidden="true"
          className="about-altitude"
          key={`${mark.label}-${index}`}
          ref={(node) => {
            marksRef.current[index] = node;
          }}
        >
          {mark.label}
        </span>
      ))}
      <svg aria-hidden="true" className="about-callouts-leaders">
        {items.map((item, index) => (
          <polyline
            className="about-callout-leader"
            data-hovered={hovered === index || undefined}
            data-state={getState(index, activeStop)}
            key={item.id}
            pathLength={1}
            ref={(node) => {
              leadersRef.current[index] = node;
            }}
            style={{'--callout-index': index} as CSSProperties}
          />
        ))}
      </svg>
      {items.map((item, index) => {
        const state = getState(index, activeStop);
        const isHovered = hovered === index;
        return (
          <Fragment key={item.id}>
            {/* The title button is the accessible control; the marker is a larger pointer target. */}
            <div
              aria-hidden="true"
              className="about-callout-anchor"
              data-hovered={isHovered || undefined}
              data-next={item.isNext || undefined}
              data-state={state}
              onClick={() => onSelect(index)}
              onPointerEnter={() => setHovered(index)}
              onPointerLeave={() => setHovered(null)}
              ref={(node) => {
                anchorsRef.current[index] = node;
              }}
              style={{'--callout-index': index} as CSSProperties}
            >
              <span className="about-callout-reticle" />
            </div>
            <div
              className="about-callout"
              ref={(node) => {
                labelsRef.current[index] = node;
              }}
            >
              <button
                aria-current={state === 'active' ? 'step' : undefined}
                aria-label={`${item.label}: show in the experience timeline`}
                className="about-callout-label"
                data-hovered={isHovered || undefined}
                data-next={item.isNext || undefined}
                data-state={state}
                onBlur={() => setHovered(null)}
                onClick={() => onSelect(index)}
                onFocus={() => setHovered(index)}
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(null)}
                style={{'--callout-index': index} as CSSProperties}
                type="button"
              >
                <span aria-hidden="true" className="about-callout-title-row">
                  <span className="about-callout-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="about-callout-title">{item.label}</span>
                </span>
                {item.meta ? <span aria-hidden="true" className="about-callout-meta">{item.meta}</span> : null}
              </button>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
