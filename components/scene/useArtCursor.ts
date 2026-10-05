'use client';

import {useEffect, useMemo} from 'react';
import {Vector2, type IUniform, type WebGLRenderer} from 'three';
import {ART_CURSOR_CONFIG} from '@/config/scene/artCursor';
import {artCursorSettings} from '@/lib/scene/artCursorSettings';
import {CursorSmudge} from '@/lib/scene/cursorSmudge';
import {CursorTouch, type CursorStroke} from '@/lib/scene/cursorTouch';
import type {MediumId} from '@/lib/terrain/mediumTransition';

const PAUSED = '.art-frame, .art-grid-work, .art-inspection';
const QUIET = '.art-stage, .art-section-all';

type CursorFrame = {
  renderer: WebGLRenderer;
  delta: number;
  uniforms: Record<string, IUniform>;
  medium: MediumId;
  active: boolean;
  width: number;
  height: number;
};

/**
 * Drives the Art cursor across the whole screen. Oil gets a brush that drags
 * the painting while the pointer moves. A smudge left behind keeps settling
 * through a medium change, so the outgoing painting never snaps back.
 * Pencil and Digital share a light that wakes with movement, trails the cursor
 * and heals away. Positions are CSS pixels with y up, matching the
 * full-viewport compositor.
 */
class ArtCursor {
  private readonly smudge = new CursorSmudge();
  private readonly touch = new CursorTouch();
  private readonly pointer = {x: 0, y: 0, inside: false, jump: true, zone: 1};
  private readonly previous = new Vector2();
  private readonly position = new Vector2();
  private readonly stroke: CursorStroke = {from: new Vector2(), to: new Vector2(), strength: 0};
  private light = 0;

  locate = (event: PointerEvent) => {
    const pointer = this.pointer;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.inside = true;
    const target = event.target instanceof Element ? event.target : null;
    pointer.zone = target?.closest(PAUSED) ? 0 : target?.closest(QUIET) ? ART_CURSOR_CONFIG.quietStrength : 1;
  };

  // A new touch or re-entry starts a fresh trail instead of streaking across the screen.
  start = (event: PointerEvent) => {
    this.locate(event);
    this.pointer.jump = true;
  };

  end = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') this.pointer.inside = false;
  };

  leave = (event: PointerEvent) => {
    if (!event.relatedTarget) this.release();
  };

  release() {
    this.pointer.inside = false;
    this.pointer.jump = true;
  }

  update({renderer, delta, uniforms, medium, active, width, height}: CursorFrame) {
    const {pointer, previous, position, stroke} = this;
    const step = Math.max(Math.min(delta, .05), 1e-3);
    position.set(pointer.x, height - pointer.y);
    if (pointer.jump) {
      previous.copy(position);
      pointer.jump = false;
    }
    stroke.from.copy(previous);
    stroke.to.copy(position);
    previous.copy(position);
    if (!active) {
      this.light = 0;
      this.touch.clear();
    }
    const speed = stroke.from.distanceTo(stroke.to) / step;

    if (!active) this.smudge.clear();
    else {
      stroke.strength = medium === 1 && pointer.inside && speed > 0 ? pointer.zone : 0;
      this.smudge.update(renderer, step, width, height, stroke.strength > 0 ? stroke : null);
    }
    const smudge = this.smudge.texture;
    uniforms.uSmudgeAmount.value = smudge ? 1 : 0;
    if (smudge) uniforms.uSmudge.value = smudge;

    const goal = active && pointer.inside ? pointer.zone * Math.min(1, speed / ART_CURSOR_CONFIG.fullSpeed) : 0;
    const seconds = goal > this.light ? ART_CURSOR_CONFIG.wakeSeconds : ART_CURSOR_CONFIG.restSeconds;
    this.light += (goal - this.light) * (1 - Math.exp(-step / seconds));
    if (!goal && this.light < .01) this.light = 0;
    stroke.strength = this.light;

    this.touch.update(renderer, step, width, height, stroke.strength > 0 ? stroke : null);
    const touch = this.touch.texture;
    uniforms.uTouchAmount.value = touch ? 1 : 0;
    if (touch) uniforms.uTouch.value = touch;
    uniforms.uPencilLines.value = artCursorSettings.pencilStrength;
    uniforms.uDotsLight.value = artCursorSettings.dotsStrength;
  }

  dispose() {
    this.smudge.dispose();
    this.touch.dispose();
  }
}

export function useArtCursor(listening: boolean) {
  const cursor = useMemo(() => new ArtCursor(), []);

  useEffect(() => () => cursor.dispose(), [cursor]);

  useEffect(() => {
    if (!listening) {
      cursor.release();
      return;
    }
    window.addEventListener('pointermove', cursor.locate, {passive: true});
    window.addEventListener('pointerdown', cursor.start, {passive: true});
    window.addEventListener('pointerup', cursor.end, {passive: true});
    window.addEventListener('pointercancel', cursor.end, {passive: true});
    document.addEventListener('pointerout', cursor.leave, {passive: true});
    return () => {
      window.removeEventListener('pointermove', cursor.locate);
      window.removeEventListener('pointerdown', cursor.start);
      window.removeEventListener('pointerup', cursor.end);
      window.removeEventListener('pointercancel', cursor.end);
      document.removeEventListener('pointerout', cursor.leave);
    };
  }, [cursor, listening]);

  return cursor;
}
