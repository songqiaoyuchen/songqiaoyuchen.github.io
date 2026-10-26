// Keeps the selected location's text clear of the globe as the camera draws it: the globe's outline on screen
// (PlacesGlobe projects its silhouette every frame, through PlacesSceneContext) becomes a float with that polygon
// as its CSS shape inside the panel, so every line of text starts past the limb at its own row, however much of
// the view the globe fills. The panel spans from the globe's centre column to the page's right gutter. Desktop
// only; phones keep their sheet (Places.css).
'use client';

import {useEffect, type MutableRefObject, type RefObject} from 'react';

/** The globe as drawn: its centre and its silhouette, CSS pixels, the points x, y in turn. */
export type GlobeOutline = {x: number; y: number; points: readonly number[]};

const PHONE = '(width < 48rem)';
const BOTTOM_PAD = 28;
// The shape is this much larger than the outline, from the centre: the glow reaches past the limb.
const GLOW_PAD = 1.04;

/**
 * The panel's box and, inside it, the float carrying the globe's outline (page pixels): its box and the polygon
 * relative to that box. The panel starts at the globe's centre column, but never nearer the right gutter than the
 * preferred column width, and never left of the gutter.
 */
export function placeLocationSheet(
  outline: GlobeOutline,
  page: {width: number; height: number; padTop: number; gutter: number},
  preferredWidth: number,
) {
  const nearest = Math.max(page.gutter, page.width - page.gutter - preferredWidth);
  const left = Math.min(Math.max(page.gutter, outline.x), nearest);
  const top = page.padTop;
  const grown: number[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index + 1 < outline.points.length; index += 2) {
    const x = outline.x + (outline.points[index] - outline.x) * GLOW_PAD;
    const y = outline.y + (outline.points[index + 1] - outline.y) * GLOW_PAD;
    grown.push(x, y);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const polygon: number[] = [];
  for (let index = 0; index + 1 < grown.length; index += 2) polygon.push(grown[index] - minX, grown[index + 1] - minY);
  return {
    top,
    left,
    width: page.width - page.gutter - left,
    height: page.height - BOTTOM_PAD - top,
    shape: {left: minX - left, top: minY - top, width: maxX - minX, height: maxY - minY, polygon},
  };
}

/** CSS `polygon()` for points relative to the float's box, whole pixels. */
export function polygonShape(polygon: readonly number[]) {
  const pairs: string[] = [];
  for (let index = 0; index + 1 < polygon.length; index += 2) {
    pairs.push(`${polygon[index].toFixed(0)}px ${polygon[index + 1].toFixed(0)}px`);
  }
  return `polygon(${pairs.join(', ')})`;
}

export function useLocationSheetPlacement(
  sheetRef: RefObject<HTMLElement | null>,
  shapeRef: RefObject<HTMLElement | null>,
  outlineRef: MutableRefObject<GlobeOutline | null>,
  active: boolean,
) {
  useEffect(() => {
    const sheet = sheetRef.current;
    const shape = shapeRef.current;
    if (!active || !sheet || !shape) return;
    const phone = window.matchMedia(PHONE);
    let frame = 0;
    let placedOnce = false;
    // The outline as last placed, half pixels: a frame whose outline matches it changes nothing on screen.
    let placedX = NaN;
    let placedY = NaN;
    let placedPoints: number[] = [];
    // The page's measures, read on resize rather than every frame: computed style right after the scene's
    // callout writes would force a style recalculation per frame.
    const page = {width: 0, height: 0, padTop: 0, gutter: 0};
    let rem = 16;
    const measure = () => {
      const section = sheet.parentElement;
      const sectionStyle = section ? window.getComputedStyle(section) : null;
      rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      page.width = window.innerWidth;
      page.height = window.innerHeight;
      page.padTop = (sectionStyle && parseFloat(sectionStyle.paddingTop)) || 0;
      page.gutter = (sectionStyle && parseFloat(sectionStyle.paddingRight)) || 0;
      placedX = NaN;
    };
    // The styles as written: the browser serialises them differently ("96.0px" reads back "96px"), so the
    // element's own values cannot tell a repeat from a change.
    const sheetWritten: Partial<Record<WrittenStyle, string>> = {};
    const shapeWritten: Partial<Record<WrittenStyle, string>> = {};
    const write = (
      style: CSSStyleDeclaration, written: Partial<Record<WrittenStyle, string>>, property: WrittenStyle, value: string,
    ) => {
      if (written[property] === value) return;
      written[property] = value;
      style[property] = value;
    };
    const clear = () => {
      sheet.style.top = sheet.style.left = sheet.style.width = sheet.style.height = '';
      sheet.style.translate = sheet.style.right = '';
      shape.style.marginLeft = shape.style.marginTop = shape.style.width = shape.style.height = '';
      shape.style.shapeOutside = '';
      for (const property of Object.keys(sheetWritten) as WrittenStyle[]) delete sheetWritten[property];
      for (const property of Object.keys(shapeWritten) as WrittenStyle[]) delete shapeWritten[property];
      placedOnce = false;
      placedX = NaN;
    };
    const half = (value: number) => Math.round(value * 2) / 2;
    const unchanged = (outline: GlobeOutline) => {
      if (half(outline.x) !== placedX || half(outline.y) !== placedY) return false;
      if (outline.points.length !== placedPoints.length) return false;
      for (let index = 0; index < placedPoints.length; index += 1) {
        if (half(outline.points[index]) !== placedPoints[index]) return false;
      }
      return true;
    };
    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      const outline = outlineRef.current;
      if (phone.matches || !sheet.parentElement) {
        if (placedOnce) clear();
        return;
      }
      // No outline: the globe has not arrived, or is leaving under a panel that is fading out (the × or the nav,
      // SceneShell's leaving state). The panel keeps its last placement rather than dropping back to the plain
      // column mid-fade; the text is placed once the outline is there.
      if (!outline || outline.points.length < 6) return;
      if (unchanged(outline)) return;
      placedX = half(outline.x);
      placedY = half(outline.y);
      if (placedPoints.length !== outline.points.length) placedPoints = new Array<number>(outline.points.length);
      for (let index = 0; index < placedPoints.length; index += 1) placedPoints[index] = half(outline.points[index]);
      // The column caps the measure where the globe leaves a row free; the float narrows it where it does not.
      const placed = placeLocationSheet(outline, page, 40 * rem);
      const polygon = polygonShape(placed.shape.polygon);
      write(sheet.style, sheetWritten, 'top', `${placed.top.toFixed(1)}px`);
      write(sheet.style, sheetWritten, 'left', `${placed.left.toFixed(1)}px`);
      write(sheet.style, sheetWritten, 'width', `${placed.width.toFixed(1)}px`);
      write(sheet.style, sheetWritten, 'height', `${placed.height.toFixed(1)}px`);
      write(sheet.style, sheetWritten, 'right', 'auto');
      write(sheet.style, sheetWritten, 'translate', '0 0');
      // Margins, not offsets: the text flows around where the float's margins put it.
      write(shape.style, shapeWritten, 'marginLeft', `${placed.shape.left.toFixed(1)}px`);
      write(shape.style, shapeWritten, 'marginTop', `${placed.shape.top.toFixed(1)}px`);
      write(shape.style, shapeWritten, 'width', `${placed.shape.width.toFixed(1)}px`);
      write(shape.style, shapeWritten, 'height', `${placed.shape.height.toFixed(1)}px`);
      // From the border box: the default margin box is shrunk by the negative margins that place the float.
      write(shape.style, shapeWritten, 'shapeOutside', `${polygon} border-box`);
      placedOnce = true;
    };
    measure();
    window.addEventListener('resize', measure);
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', measure);
      window.cancelAnimationFrame(frame);
      clear();
    };
  }, [active, outlineRef, shapeRef, sheetRef]);
}

type WrittenStyle = 'top' | 'left' | 'width' | 'height' | 'right' | 'translate' | 'marginLeft' | 'marginTop'
  | 'shapeOutside';
