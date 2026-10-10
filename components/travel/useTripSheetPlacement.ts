// Keeps the selected trip's text clear of the globe as the camera draws it: the globe's outline on screen
// (TravelGlobe projects its silhouette every frame, through TravelSceneContext) becomes a float with that polygon
// as its CSS shape inside the panel, so every line of text starts past the limb at its own row, however much of
// the view the globe fills. The panel spans from the globe's centre column to the page's right gutter. Desktop
// only; phones keep their sheet (Travel.css).
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
export function placeTripSheet(
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

export function useTripSheetPlacement(
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
    let last = '';
    const clear = () => {
      sheet.style.top = sheet.style.left = sheet.style.width = sheet.style.height = '';
      sheet.style.translate = sheet.style.right = '';
      shape.style.marginLeft = shape.style.marginTop = shape.style.width = shape.style.height = '';
      shape.style.shapeOutside = '';
      last = '';
    };
    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      const outline = outlineRef.current;
      const section = sheet.parentElement;
      if (phone.matches || !outline || outline.points.length < 6 || !section) {
        if (last) clear();
        return;
      }
      const sectionStyle = window.getComputedStyle(section);
      const rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      const page = {
        width: window.innerWidth,
        height: window.innerHeight,
        padTop: parseFloat(sectionStyle.paddingTop) || 0,
        gutter: parseFloat(sectionStyle.paddingRight) || 0,
      };
      // The column caps the measure where the globe leaves a row free; the float narrows it where it does not.
      const placed = placeTripSheet(outline, page, 40 * rem);
      const polygon = polygonShape(placed.shape.polygon);
      const key = `${placed.top.toFixed(0)},${placed.left.toFixed(0)},${placed.width.toFixed(0)},`
        + `${placed.shape.left.toFixed(0)},${placed.shape.top.toFixed(0)},${polygon}`;
      if (key === last) return;
      last = key;
      sheet.style.top = `${placed.top.toFixed(1)}px`;
      sheet.style.left = `${placed.left.toFixed(1)}px`;
      sheet.style.width = `${placed.width.toFixed(1)}px`;
      sheet.style.height = `${placed.height.toFixed(1)}px`;
      sheet.style.right = 'auto';
      sheet.style.translate = '0 0';
      // Margins, not offsets: the text flows around where the float's margins put it.
      shape.style.marginLeft = `${placed.shape.left.toFixed(1)}px`;
      shape.style.marginTop = `${placed.shape.top.toFixed(1)}px`;
      shape.style.width = `${placed.shape.width.toFixed(1)}px`;
      shape.style.height = `${placed.shape.height.toFixed(1)}px`;
      // From the border box: the default margin box is shrunk by the negative margins that place the float.
      shape.style.shapeOutside = `${polygon} border-box`;
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      clear();
    };
  }, [active, outlineRef, shapeRef, sheetRef]);
}
