// Free zoom for an inspected image on desktops (pointer: fine, wide): the wheel or a trackpad pinch zooms about the
// pointer, a drag pans the zoomed image, a double-click toggles between fit and a close look, and + / - / 0 zoom from
// the keyboard. The image's own transform carries it, clamped so it never leaves a gap it could cover; the viewport
// clips it. Touch screens keep the browser's own pinch-zoom, so nothing is attached there. Shared by Inspection and
// the Places photo inspection (config/art/inspectionZoom.ts).
'use client';

import {useSpring} from 'motion/react';
import {useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent,
  type PointerEvent, type RefObject} from 'react';
import {INSPECTION_ZOOM_CONFIG} from '@/config/art/inspectionZoom';
import {VIEWPORT_MEDIA} from '@/config/breakpoints';
import {useReducedMotion} from '@/hooks/useReducedMotion';

const {spring, wheelRate, pinchRate, doubleClick, keyStep, maxAtLeast} = INSPECTION_ZOOM_CONFIG;

type View = {scale: number; x: number; y: number};
const FIT: View = {scale: 1, x: 0, y: 0};

type InspectionZoomOptions = {
  /** The positioned box that clips the image; the image is its descendant, placed in it by layout. */
  viewportRef: RefObject<HTMLElement | null>;
  imageRef: RefObject<HTMLElement | null>;
  /** The widest the image comes (px), which sets the deepest zoom. */
  naturalWidth: number;
};

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

export function useInspectionZoom({viewportRef, imageRef, naturalWidth}: InspectionZoomOptions) {
  const reducedMotion = useReducedMotion();
  const scale = useSpring(1, spring);
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const target = useRef<View>(FIT);
  const [enabled, setEnabled] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const drag = useRef<{x: number; y: number; from: View} | null>(null);

  useEffect(() => {
    const media = window.matchMedia(VIEWPORT_MEDIA.touchOrNarrow);
    const update = () => setEnabled(!media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // The viewport's size, and the fitted image's size and centre in it (untransformed layout).
  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image || !image.offsetWidth) return null;
    let left = 0;
    let top = 0;
    for (let at: HTMLElement | null = image; at && at !== viewport; at = at.offsetParent as HTMLElement | null) {
      left += at.offsetLeft;
      top += at.offsetTop;
    }
    const width = image.offsetWidth;
    const height = image.offsetHeight;
    return {
      viewport, width, height, spanX: viewport.clientWidth, spanY: viewport.clientHeight,
      cx: left + width / 2, cy: top + height / 2, max: Math.max(maxAtLeast, naturalWidth / width),
    };
  }, [imageRef, naturalWidth, viewportRef]);

  const settle = useCallback((next: View, immediate = false) => {
    const frame = measure();
    if (!frame) return;
    const zoom = clamp(next.scale, 1, frame.max);
    // Within the viewport while it fits that way, else covering it edge to edge.
    const axis = (offset: number, size: number, span: number, centre: number) => {
      const a = (size * zoom) / 2 - centre;
      const b = span - centre - (size * zoom) / 2;
      return clamp(offset, Math.min(a, b), Math.max(a, b));
    };
    const view = zoom <= 1 ? FIT : {
      scale: zoom,
      x: axis(next.x, frame.width, frame.spanX, frame.cx),
      y: axis(next.y, frame.height, frame.spanY, frame.cy),
    };
    target.current = view;
    const now = immediate || reducedMotion;
    for (const [value, to] of [[scale, view.scale], [x, view.x], [y, view.y]] as const) {
      if (now) value.jump(to);
      else value.set(to);
    }
  }, [measure, reducedMotion, scale, x, y]);

  /** Zooms by `factor` keeping the point (px, py) in the viewport where it is. */
  const zoomAt = useCallback((factor: number, px: number, py: number, immediate = false) => {
    const frame = measure();
    if (!frame) return;
    const from = target.current;
    const zoom = clamp(from.scale * factor, 1, frame.max);
    const k = zoom / from.scale;
    settle({
      scale: zoom,
      x: px - frame.cx - (px - frame.cx - from.x) * k,
      y: py - frame.cy - (py - frame.cy - from.y) * k,
    }, immediate);
  }, [measure, settle]);

  // The image's transform follows the springs, written directly so zooming renders nothing but the cursor's change.
  useLayoutEffect(() => {
    const write = () => {
      const image = imageRef.current;
      if (!image) return;
      const zoom = scale.get();
      image.style.transform = zoom === 1 && !x.get() && !y.get()
        ? ''
        : `translate(${x.get()}px, ${y.get()}px) scale(${zoom})`;
    };
    const onScale = () => {
      write();
      setZoomed(scale.get() > 1);
    };
    write();
    const stops = [scale.on('change', onScale), x.on('change', write), y.on('change', write)];
    return () => stops.forEach((stop) => stop());
  }, [imageRef, scale, x, y]);

  // A resized window starts again at fit.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => settle(FIT, true));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [settle, viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !enabled) return;
    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
      // At fit there is nothing to zoom out of: the page may scroll instead.
      if (!event.ctrlKey && delta > 0 && target.current.scale <= 1) return;
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      // A pinch arrives as many small steps, followed directly; wheel steps spring.
      zoomAt(
        Math.exp(-delta * (event.ctrlKey ? pinchRate : wheelRate)),
        event.clientX - rect.left - viewport.clientLeft,
        event.clientY - rect.top - viewport.clientTop,
        event.ctrlKey,
      );
    };
    viewport.addEventListener('wheel', onWheel, {passive: false});
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [enabled, viewportRef, zoomAt]);

  const point = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [event.clientX - rect.left - event.currentTarget.clientLeft,
      event.clientY - rect.top - event.currentTarget.clientTop] as const;
  };

  /** Props for the viewport element. */
  const viewportProps = enabled ? {
    'data-zoom': zoomed ? 'zoomed' : 'fit',
    onDoubleClick: (event: MouseEvent<HTMLElement>) => {
      if (target.current.scale > 1) settle(FIT);
      else zoomAt(doubleClick, ...point(event));
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || target.current.scale <= 1) return;
      drag.current = {x: event.clientX, y: event.clientY, from: target.current};
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = drag.current;
      if (!current) return;
      const {from} = current;
      settle({...from, x: from.x + event.clientX - current.x, y: from.y + event.clientY - current.y}, true);
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
  } : {};

  /** + / - / 0 zoom about the middle, and Escape first returns to fit; true when the key was one of them. */
  const handleKey = (event: KeyboardEvent) => {
    const frame = enabled && !event.metaKey && !event.ctrlKey && !event.altKey ? measure() : null;
    if (!frame) return false;
    const middle = [frame.spanX / 2, frame.spanY / 2] as const;
    if (event.key === '+' || event.key === '=') zoomAt(keyStep, ...middle);
    else if (event.key === '-' || event.key === '_') zoomAt(1 / keyStep, ...middle);
    else if (event.key === '0' || (event.key === 'Escape' && target.current.scale > 1)) settle(FIT);
    else return false;
    event.preventDefault();
    return true;
  };

  return {enabled, zoomed, viewportProps, handleKey};
}

/**
 * The image source to show: `src` until `large` (a bigger copy for zooming in) has loaded and decoded, then `large`,
 * shown unresized (`full`). Only fetched while `enabled` (desktops, where the zoom is), and never when there is none.
 * `large` may be `src` itself: the original rather than the resized copy the image optimiser serves. Once swapped,
 * `style` keeps the copy shown before as the image's background, so it never blanks while the element decodes.
 */
export function useFullResolution(
  imageRef: RefObject<HTMLImageElement | null>, src: string, large: string | undefined, enabled: boolean,
) {
  const [loaded, setLoaded] = useState<{large: string; before: string} | null>(null);
  useEffect(() => {
    if (!enabled || !large) return;
    let live = true;
    const image = new window.Image();
    image.src = large;
    image.decode().then(() => {
      if (live) setLoaded({large, before: imageRef.current?.currentSrc ?? ''});
    }, () => {});
    return () => { live = false; };
  }, [enabled, imageRef, large, src]);
  if (!loaded || loaded.large !== large) return {src, full: false, style: undefined};
  const style = loaded.before ? {background: `url("${loaded.before}") center / 100% 100% no-repeat`} : undefined;
  return {src: large, full: true, style};
}
