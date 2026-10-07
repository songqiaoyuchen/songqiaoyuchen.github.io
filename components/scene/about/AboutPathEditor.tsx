// About route editor (dev only; Leva: About Path › Edit route). A pen-tool pass over the route: its waypoints
// show as anchors that drag over the terrain and a click on the route adds one. Clicking an anchor selects it;
// Delete or Backspace, a right-click, an alt-click or the Remove anchor button removes it. Each checkpoint's
// diamond slides along the route between its neighbours. Save route writes the waypoints and checkpoints to
// config/scene/aboutPath.ts; Reset route restores what is saved there.
'use client';

import {useThree, type ThreeEvent} from '@react-three/fiber';
import {button, useControls} from 'leva';
import {useEffect, useMemo, useRef, useState} from 'react';
import {CatmullRomCurve3, Plane, TubeGeometry, Vector3} from 'three';
import type {OrbitControls as OrbitControlsInstance} from 'three-stdlib';
import {postConfigValues} from '@/components/scene/controls/saveConfig';
import {ABOUT_PATH_FOLDER} from '@/components/scene/controls/useAboutPathControls';
import {
  ABOUT_CHECKPOINTS, ABOUT_ROUTE, type AboutCheckpointId, type PlanPoint,
} from '@/config/scene/aboutPath';
import {nearestSample, sampleRoutePlan, snapCheckpoints, spanOfSample} from '@/lib/scene/aboutPath';

const ANCHOR_RADIUS = 0.022;
const STOP_RADIUS = 0.045;
const HIT_RADIUS = 0.07; // the invisible tube that catches clicks on the route
const CLICK_SLOP = 3; // px the pointer may travel for a press to still count as a click
const ACCENT = '#e8c77a'; // --color-accent
const HOVER = '#ffffff';
const MIN_WAYPOINTS = 2;

const round = (value: number) => Math.round(value * 1000) / 1000;
const roundPoint = ([x, z]: PlanPoint): PlanPoint => [round(x), round(z)];

export type EditableCheckpoint = {id: AboutCheckpointId; point: PlanPoint};

type Drag = {
  kind: 'anchor' | 'stop';
  index: number;
  /** Horizontal plane the pointer ray is cast onto; it follows the terrain under a dragged anchor. */
  plane: Plane;
};

type AboutPathEditorProps = {
  waypoints: readonly PlanPoint[];
  onWaypointsChange: (waypoints: readonly PlanPoint[]) => void;
  /** Checkpoints in stop order. */
  checkpoints: readonly EditableCheckpoint[];
  onCheckpointChange: (id: AboutCheckpointId, point: PlanPoint) => void;
  heightAt: (x: number, z: number) => number;
  signalColor: string;
  onEditingChange: (editing: boolean) => void;
};

export function AboutPathEditor({
  waypoints, onWaypointsChange, checkpoints, onCheckpointChange, heightAt, signalColor, onEditingChange,
}: AboutPathEditorProps) {
  // Read at event time: the development OrbitControls (SceneCanvas, makeDefault) and the canvas for its cursor.
  const getState = useThree((state) => state.get);
  const [status, setStatus] = useState('Not saved');
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const hit = useMemo(() => new Vector3(), []);
  // The Leva buttons and the key handler read the latest props and selection without re-registering.
  const latest = useRef({waypoints, checkpoints, selected, onWaypointsChange, onCheckpointChange});
  useEffect(() => {
    latest.current = {waypoints, checkpoints, selected, onWaypointsChange, onCheckpointChange};
  });

  function removeAnchor(index: number) {
    const {waypoints: current, onWaypointsChange: change} = latest.current;
    if (current.length <= MIN_WAYPOINTS) return;
    change(current.filter((_, position) => position !== index));
    setSelected(null);
    setHovered(null);
  }

  // Joins the About Path folder (settings from useAboutPathControls); these keys are not saved by Save Config.
  const [{edit}, set] = useControls(ABOUT_PATH_FOLDER, () => ({
    // This file: shows the route's anchors and checkpoint sliders over the terrain.
    edit: {
      value: false,
      label: 'Edit route',
      hint: 'Drag anchors over the terrain; click the route to add one; click an anchor to select it, then '
        + 'Delete, right-click, alt-click or Remove anchor; drag a diamond along the route',
    },
    // Removes the selected anchor (also Delete, Backspace, right-click or alt-click on it).
    'Remove anchor': button(() => {
      if (latest.current.selected !== null) removeAnchor(latest.current.selected);
    }),
    // Restores the route and checkpoints saved in config/scene/aboutPath.ts.
    'Reset route': button(() => {
      latest.current.onWaypointsChange(ABOUT_ROUTE.waypoints);
      for (const [id, point] of Object.entries(ABOUT_CHECKPOINTS)) {
        latest.current.onCheckpointChange(id as AboutCheckpointId, point);
      }
      setSelected(null);
    }),
    // app/api/dev-config: writes the waypoints and every checkpoint to config/scene/aboutPath.ts.
    'Save route': button(async () => {
      setStatus('Saving...');
      const saved = await postConfigValues('Save About route', {
        'aboutPath.waypoints': latest.current.waypoints.map(roundPoint),
        ...Object.fromEntries(
          latest.current.checkpoints.map(({id, point}) => [`aboutPath.${id}`, roundPoint(point)]),
        ),
      });
      setStatus(saved ? 'Saved to aboutPath.ts' : 'Save failed; retry');
    }),
    // Read-only save feedback.
    status: {value: 'Not saved', label: 'Status', editable: false},
  }), []);

  useEffect(() => set({status}), [set, status]);
  useEffect(() => {
    onEditingChange(edit);
  }, [edit, onEditingChange]);
  useEffect(() => () => onEditingChange(false), [onEditingChange]);
  useEffect(() => {
    const {domElement} = getState().gl;
    domElement.style.cursor = dragging ? 'grabbing' : hovered ? 'grab' : '';
    return () => {
      domElement.style.cursor = '';
    };
  }, [dragging, getState, hovered]);

  // Delete or Backspace removes the selected anchor, unless typing in a field (the Leva panel).
  useEffect(() => {
    if (!edit) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (latest.current.selected === null) return;
      event.preventDefault();
      removeAnchor(latest.current.selected);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [edit]);

  const plan = useMemo(() => sampleRoutePlan(waypoints), [waypoints]);
  const {samples} = plan;
  const stopIndices = useMemo(
    () => snapCheckpoints(samples, checkpoints.map(({point}) => point)),
    [checkpoints, samples],
  );
  const hitGeometry = useMemo(() => {
    if (!edit) return null;
    const draped = samples.map((point) => new Vector3(point.x, heightAt(point.x, point.z), point.z));
    return new TubeGeometry(new CatmullRomCurve3(draped), draped.length, HIT_RADIUS, 6);
  }, [edit, heightAt, samples]);
  useEffect(() => () => hitGeometry?.dispose(), [hitGeometry]);

  // A handle drag must not orbit the camera.
  function setOrbitEnabled(enabled: boolean) {
    const controls = getState().controls as OrbitControlsInstance | null;
    if (controls) controls.enabled = enabled;
  }

  function beginDrag(event: ThreeEvent<PointerEvent>, kind: Drag['kind'], index: number) {
    if (event.button !== 0) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    drag.current = {kind, index, plane: new Plane(new Vector3(0, 1, 0), -event.point.y)};
    setOrbitEnabled(false);
    setDragging(true);
    setSelected(kind === 'anchor' ? index : null);
  }

  function moveDrag(event: ThreeEvent<PointerEvent>) {
    const current = drag.current;
    if (!current || !event.ray.intersectPlane(current.plane, hit)) return;
    event.stopPropagation();
    if (current.kind === 'anchor') {
      current.plane.constant = -heightAt(hit.x, hit.z);
      onWaypointsChange(waypoints.map((point, index) => (index === current.index ? [hit.x, hit.z] : point)));
      return;
    }
    // A checkpoint slides along the route, staying between its neighbours.
    const from = current.index === 0 ? 0 : stopIndices[current.index - 1] + 1;
    const to = current.index === checkpoints.length - 1 ? samples.length - 1 : stopIndices[current.index + 1] - 1;
    if (from > to) return;
    const sample = samples[nearestSample(samples, [hit.x, hit.z], from, to)];
    onCheckpointChange(checkpoints[current.index].id, [sample.x, sample.z]);
  }

  function endDrag(event: ThreeEvent<PointerEvent>) {
    if (!drag.current) return;
    drag.current = null;
    (event.target as Element).releasePointerCapture(event.pointerId);
    setOrbitEnabled(true);
    setDragging(false);
  }

  function clickAnchor(event: ThreeEvent<MouseEvent>, index: number) {
    event.stopPropagation();
    if (event.delta > CLICK_SLOP) return;
    if (event.altKey) removeAnchor(index);
    else setSelected(index);
  }

  function contextMenuAnchor(event: ThreeEvent<MouseEvent>, index: number) {
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    removeAnchor(index);
  }

  function insertAnchor(event: ThreeEvent<MouseEvent>) {
    if (event.delta > CLICK_SLOP) return;
    event.stopPropagation();
    const point: PlanPoint = [event.point.x, event.point.z];
    const span = Math.min(spanOfSample(plan, nearestSample(samples, point)), waypoints.length - 2);
    onWaypointsChange([...waypoints.slice(0, span + 1), point, ...waypoints.slice(span + 1)]);
    setSelected(span + 1);
  }

  if (!edit || !hitGeometry) return null;

  return (
    <group>
      <mesh geometry={hitGeometry} onClick={insertAnchor}>
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      {waypoints.map(([x, z], index) => {
        const key = `anchor-${index}`;
        const lit = hovered === key || selected === index;
        return (
          <mesh
            key={key}
            onClick={(event) => clickAnchor(event, index)}
            onContextMenu={(event) => contextMenuAnchor(event, index)}
            onPointerDown={(event) => beginDrag(event, 'anchor', index)}
            onPointerMove={moveDrag}
            onPointerOut={() => setHovered((current) => (current === key ? null : current))}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHovered(key);
            }}
            onPointerUp={endDrag}
            position={[x, heightAt(x, z), z]}
            renderOrder={3}
            scale={selected === index ? 1.4 : 1}
          >
            <sphereGeometry args={[ANCHOR_RADIUS, 12, 8]} />
            <meshBasicMaterial color={lit ? HOVER : signalColor} depthTest={false} transparent />
          </mesh>
        );
      })}
      {checkpoints.map(({id}, index) => {
        const key = `stop-${id}`;
        const sample = samples[stopIndices[index]];
        return (
          <mesh
            key={key}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => beginDrag(event, 'stop', index)}
            onPointerMove={moveDrag}
            onPointerOut={() => setHovered((current) => (current === key ? null : current))}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHovered(key);
            }}
            onPointerUp={endDrag}
            position={[sample.x, heightAt(sample.x, sample.z), sample.z]}
            renderOrder={4}
          >
            <octahedronGeometry args={[STOP_RADIUS]} />
            <meshBasicMaterial color={hovered === key ? HOVER : ACCENT} depthTest={false} transparent />
          </mesh>
        );
      })}
    </group>
  );
}
