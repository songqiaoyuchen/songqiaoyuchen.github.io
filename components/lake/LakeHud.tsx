// The dive screen: the sonar readouts (metres to the wall on each side, counting up with the ping's front), depth,
// speed and the hull, the scanning label, the system's warnings (contact, the hull critical, the breach), a hint and
// the way out. It owns the player's input: arrow or WASD keys and a drag
// steer, space, enter, a click or a tap send a ping, Escape surfaces. Numbers are written straight into the DOM
// from the dive's telemetry each frame, so nothing re-renders.
'use client';

import {useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent} from 'react';
import {LAKE_DIVE_CONFIG} from '@/config/scene/lake';
import {isUnderwater, type LakeInput, type LakeState, type LakeTelemetry} from './lakeState';

const TAP_PIXELS = 10;
const TAP_SECONDS = 0.35;
const STEER_PIXELS = 140;
// The eased contact mark (telemetry.bump) above which the screen says the craft is on the wall.
const CONTACT_SHOWN = 0.2;
const WARNINGS = {contact: 'Hull contact', critical: 'Hull critical', none: ''} as const;

type LakeHudProps = {
  state: LakeState;
  letterOpen: boolean;
  /** The bottle has been found before: the dive may be skipped to the basin. */
  completed: boolean;
  inputRef: MutableRefObject<LakeInput>;
  telemetryRef: MutableRefObject<LakeTelemetry>;
  onSurface: () => void;
  /** The bottle is in reach: the player opens it. */
  onOpenLetter: () => void;
};

const KEYS: Record<string, keyof typeof HELD> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
};
const HELD = {left: false, right: false, up: false, down: false};

function formatMetres(metres: number) {
  return `${Math.round(metres)}m`;
}

export function LakeHud({
  state, letterOpen, completed, inputRef, telemetryRef, onSurface, onOpenLetter,
}: LakeHudProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLSpanElement>(null);
  const pitchRef = useRef<HTMLSpanElement>(null);
  const scanRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const sonarRef = useRef<HTMLSpanElement>(null);
  const hullRef = useRef<HTMLSpanElement>(null);
  const warningRef = useRef<HTMLSpanElement>(null);
  const held = useRef({...HELD});
  const drag = useRef<{id: number; x: number; y: number; at: number; moved: boolean} | null>(null);
  const steer = useRef({yaw: 0, pitch: 0});
  // Until the player's first ping, the screen says how to scan.
  const scanHintShown = useRef(true);
  const underwater = isUnderwater(state);
  const active = state === 'diving';
  const shown = state !== 'idle' && state !== 'entering' && state !== 'returning';
  // A breach holds the dead screen until the next dive, through the veil on the way up.
  const [dead, setDead] = useState(false);
  if (state === 'breached' && !dead) setDead(true);
  if ((state === 'diving' || state === 'idle') && dead) setDead(false);

  // Keyboard: held keys steer, space or enter pings, Escape surfaces (the letter has its own Escape).
  useEffect(() => {
    if (!underwater) return;
    const keys = held.current;
    const apply = () => {
      const input = inputRef.current;
      input.yaw = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + steer.current.yaw;
      input.pitch = (keys.up ? 1 : 0) - (keys.down ? 1 : 0) + steer.current.pitch;
      input.yaw = Math.max(-1, Math.min(1, input.yaw));
      input.pitch = Math.max(-1, Math.min(1, input.pitch));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const field = event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]');
      if (field || letterOpen) return;
      const key = KEYS[event.code];
      if (key) {
        keys[key] = true;
        apply();
        event.preventDefault();
      } else if (event.code === 'Space' || event.code === 'Enter') {
        if (state === 'found') onOpenLetter();
        else inputRef.current.ping = true;
        scanHintShown.current = false;
        event.preventDefault();
      } else if (event.key === 'Escape') {
        onSurface();
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = KEYS[event.code];
      if (!key) return;
      keys[key] = false;
      apply();
    };
    const release = () => {
      keys.left = keys.right = keys.up = keys.down = false;
      steer.current.yaw = steer.current.pitch = 0;
      apply();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
      release();
    };
  }, [inputRef, letterOpen, onOpenLetter, onSurface, state, underwater]);

  // Pointer: a drag steers by its offset from where it began; a short still press pings.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (state === 'found') {
      onOpenLetter();
      return;
    }
    if (!active) return;
    drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), moved: false};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.hypot(dx, dy) > TAP_PIXELS) current.moved = true;
    if (!current.moved) return;
    steer.current.yaw = Math.max(-1, Math.min(1, dx / STEER_PIXELS));
    steer.current.pitch = Math.max(-1, Math.min(1, -dy / STEER_PIXELS));
    const keys = held.current;
    const input = inputRef.current;
    input.yaw = Math.max(-1, Math.min(1, (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + steer.current.yaw));
    input.pitch = Math.max(-1, Math.min(1, (keys.up ? 1 : 0) - (keys.down ? 1 : 0) + steer.current.pitch));
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (!current.moved && performance.now() - current.at < TAP_SECONDS * 1000) {
      inputRef.current.ping = true;
      scanHintShown.current = false;
    }
    steer.current.yaw = steer.current.pitch = 0;
    const keys = held.current;
    inputRef.current.yaw = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    inputRef.current.pitch = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  };

  // Each dive starts with the scan hint.
  useEffect(() => {
    if (state === 'diving') scanHintShown.current = true;
  }, [state]);

  // The readouts, from the dive's telemetry, written each frame; each write only when its text or value changed,
  // so a still frame touches no style (a write of the same value still costs a style pass).
  useEffect(() => {
    if (!shown) return;
    let frame = 0;
    const last = new Map<string, string>();
    const write = (key: string, value: string, apply: (value: string) => void) => {
      if (last.get(key) === value) return;
      last.set(key, value);
      apply(value);
    };
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const t = telemetryRef.current;
      const root = rootRef.current;
      if (!root) return;
      const measured = t.measured >= 0;
      const left = leftRef.current;
      const right = rightRef.current;
      if (left) {
        write('left', measured ? formatMetres(t.left) : '---', (v) => { left.textContent = v; });
        write('leftOpacity', (measured ? 0.35 + 0.65 * t.leftFresh : 0.3).toFixed(2),
          (v) => { left.style.opacity = v; });
      }
      if (right) {
        write('right', measured ? formatMetres(t.right) : '---', (v) => { right.textContent = v; });
        write('rightOpacity', (measured ? 0.35 + 0.65 * t.rightFresh : 0.3).toFixed(2),
          (v) => { right.style.opacity = v; });
      }
      const depth = depthRef.current;
      if (depth) write('depth', `-${t.depth.toFixed(1)}m`, (v) => { depth.textContent = v; });
      const speed = speedRef.current;
      if (speed) write('speed', `${t.speed.toFixed(1)}m/s`, (v) => { speed.textContent = v; });
      const heading = headingRef.current;
      if (heading) {
        write('heading', `${Math.round(t.heading).toString().padStart(3, '0')}°`, (v) => { heading.textContent = v; });
      }
      const pitch = pitchRef.current;
      if (pitch) write('pitch', `${t.pitch >= 0 ? '+' : ''}${Math.round(t.pitch)}°`, (v) => { pitch.textContent = v; });
      const scan = scanRef.current;
      if (scan) write('scan', Math.min(1, t.scanning * 1.6).toFixed(2), (v) => { scan.style.opacity = v; });
      const progress = progressRef.current;
      if (progress) write('progress', t.progress.toFixed(3), (v) => { progress.style.transform = `scaleX(${v})`; });
      const sonar = sonarRef.current;
      if (sonar) write('sonar', t.cooldown.toFixed(3), (v) => { sonar.style.transform = `scaleX(${v})`; });
      const hull = hullRef.current;
      if (hull) write('hull', `${Math.ceil(t.hull * 100)}%`, (v) => { hull.textContent = v; });
      // The warning: on the wall, quicker once critical; critical alone off it.
      const critical = t.hull < LAKE_DIVE_CONFIG.hullCritical;
      const touching = t.bump > CONTACT_SHOWN;
      const warn = touching ? (critical ? 'contact-critical' : 'contact') : critical ? 'critical' : 'none';
      write('warn', warn, (v) => { root.dataset.warn = v; });
      const warning = warningRef.current;
      if (warning) {
        write('warning', WARNINGS[critical ? 'critical' : touching ? 'contact' : 'none'],
          (v) => { warning.textContent = v; });
      }
      write('hullState', critical ? 'critical' : 'ok', (v) => { root.dataset.hull = v; });
      write('side', t.contactSide < 0 ? 'left' : 'right', (v) => { root.dataset.side = v; });
      write('bump', t.bump.toFixed(2), (v) => root.style.setProperty('--lake-bump', v));
      write('scanHint', scanHintShown.current ? 'shown' : 'hidden', (v) => { root.dataset.scanHint = v; });
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shown, telemetryRef]);

  return (
    <div
      ref={rootRef}
      className="lake-hud"
      data-state={state}
      data-shown={shown || undefined}
      data-letter={letterOpen || undefined}
      data-dead={dead || undefined}
      aria-hidden={!shown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="lake-hud-vignette" aria-hidden />
      <span className="lake-hud-edge lake-hud-edge-left" aria-hidden />
      <span className="lake-hud-edge lake-hud-edge-right" aria-hidden />
      <p className="lake-hud-warning" aria-live="polite">
        <span ref={warningRef} />
      </p>
      <div className="lake-hud-breach" aria-live="assertive">
        {dead ? (
          <>
            <p className="lake-hud-breach-title">Hull breach</p>
            <p className="lake-hud-breach-detail">Systems offline</p>
          </>
        ) : null}
      </div>
      <p className="lake-hud-scan" aria-live="polite">
        <span ref={scanRef}>Scanning</span>
      </p>
      <p className="lake-hud-scan-hint">
        <span className="lake-hud-hint-keys">Press space to scan</span>
        <span className="lake-hud-hint-touch">Tap to scan</span>
      </p>
      <button
        type="button"
        className="lake-hud-open"
        tabIndex={state === 'found' ? 0 : -1}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (state === 'found') onOpenLetter();
        }}
      >
        Open the bottle
      </button>
      <p className="lake-hud-readout lake-hud-readout-left">
        <span className="lake-hud-tick" aria-hidden />
        <span ref={leftRef}>---</span>
        <span className="sr-only"> to the left wall</span>
      </p>
      <p className="lake-hud-readout lake-hud-readout-right">
        <span ref={rightRef}>---</span>
        <span className="sr-only"> to the right wall</span>
        <span className="lake-hud-tick" aria-hidden />
      </p>
      <div className="lake-hud-bottom">
        <p className="lake-hud-depth">
          <span className="lake-hud-label">Depth</span>
          <span ref={depthRef}>-0.0m</span>
        </p>
        <p className="lake-hud-speed">
          <span className="lake-hud-label">Speed</span>
          <span ref={speedRef}>0.0m/s</span>
          <span className="lake-hud-label">Hull</span>
          <span ref={hullRef} className="lake-hud-hull">100%</span>
        </p>
        <p className="lake-hud-attitude">
          <span className="lake-hud-label">Hdg</span>
          <span ref={headingRef}>000°</span>
          <span className="lake-hud-label">Pitch</span>
          <span ref={pitchRef}>+0°</span>
        </p>
        <span className="lake-hud-progress" aria-hidden><span ref={progressRef} /></span>
        <p className="lake-hud-sonar">
          <span className="lake-hud-sonar-bar" aria-hidden><span ref={sonarRef} /></span>
        </p>
      </div>
      {/* The controls, the whole dive through; the way out is the Surface control's own. */}
      <p className="lake-hud-hint">
        <span className="lake-hud-hint-keys">
          <span><kbd>Arrows</kbd> Steer</span>
          <span><kbd>Space</kbd> Scan</span>
        </span>
        <span className="lake-hud-hint-touch">
          <span>Drag to steer</span>
          <span>Tap to scan</span>
        </span>
      </p>
      {completed ? (
        <button
          type="button"
          className="lake-hud-skip"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (state === 'diving') inputRef.current.skip = true;
          }}
        >
          Skip to the bottle
        </button>
      ) : null}
      <button
        type="button"
        className="lake-hud-surface"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onSurface();
        }}
      >
        Surface
        <kbd className="lake-hud-hint-keys">Esc</kbd>
      </button>
    </div>
  );
}
