// Keeps the selected location's text clear of the globe as the camera draws it: the globe's outline on screen
// (PlacesGlobe projects its silhouette every frame, through PlacesSceneContext) becomes a float with that polygon
// as its CSS shape inside the panel, so every line of text starts past the limb at its own row, however much of
// the view the globe fills. The panel spans from the globe's centre column to the page's right gutter and scrolls
// when its text is taller than the page: the float is placed in the panel's scrolled coordinates, so the exclusion
// stays on the globe while the lines pass it, each scrolled frame re-flowing the lines beside the limb. Its box is
// only as tall as the page (rows out of view flow at full width and re-flow as they enter), ends at the panel's
// right edge, and leaves a least column, because a line with no room beside a float goes below it, here out of
// view. Desktop only; phones keep their sheet (Places.css).
'use client';

import {useEffect, type MutableRefObject, type RefObject} from 'react';

/** The globe as drawn: its centre and its silhouette, CSS pixels, the points x, y in turn. */
export type GlobeOutline = {x: number; y: number; points: readonly number[]};

// Places' sheet layout, phones and tablets: config/breakpoints.ts belowPlacesSheet, as Places.css has it (written out
// so the node test scripts can load this module without the path alias).
const PHONE = '(width < 72rem)';
const BOTTOM_PAD = 28;
// The shape is this much larger than the outline, from the centre: the glow reaches past the limb.
const GLOW_PAD = 1.04;
// The least column of text the float leaves at any row, rem: where the limb would take more, the box is cut there
// (its shape margin with it) and the text runs over the globe's edge instead. Wider than the widest thing a row
// cannot break, a strip's first photo, so no row is ever sent below the float.
const MIN_COLUMN_REM = 20;
// A wheel step in lines or pages (deltaMode), CSS pixels per line.
const WHEEL_LINE = 16;

/**
 * The panel's box and, inside it, the float carrying the globe's outline (page pixels): its box and the polygon
 * relative to that box's unclipped origin. The panel starts at the globe's centre column, but never nearer the right
 * gutter than the preferred column width, and never left of the gutter. The float's top follows the panel's scroll,
 * its bottom is the panel's visible bottom, and its right edge the panel's edge less the least column.
 */
export function placeLocationSheet(
  outline: GlobeOutline,
  page: {width: number; height: number; padTop: number; gutter: number},
  preferredWidth: number,
  scrollTop = 0,
  minColumn = 0,
) {
  const nearest = Math.max(page.gutter, page.width - page.gutter - preferredWidth);
  const left = Math.min(Math.max(page.gutter, outline.x), nearest);
  const top = page.padTop;
  const right = page.width - page.gutter;
  const height = page.height - BOTTOM_PAD - top;
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
    width: right - left,
    height,
    shape: {
      left: minX - left,
      top: minY - top + scrollTop,
      width: Math.max(0, Math.min(maxX, right - minColumn) - minX),
      height: Math.max(0, Math.min(maxY, top + height) - minY),
      polygon,
    },
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
    // The photo strips (LocationPanel.tsx .places-photos-row) cannot flow around the float themselves: each row's
    // probe line lands past the limb, and the strip is placed from where it landed, its gallery's head with it so
    // the gallery reads as one block (the var is set on the gallery). While the globe moves this is
    // read at the start of the next frame, from the layout the last frame painted, so the read forces no layout of
    // its own and the strips follow the text by a frame; on a scroll it is read at once, in the frame that scrolled,
    // so the strips never trail the lines. Pending after the shape is placed, and when the panel's content changes.
    let indentPending = false;
    const indent = () => {
      indentPending = false;
      for (const row of sheet.querySelectorAll<HTMLElement>('.places-photos-row')) {
        const probe = row.firstElementChild as HTMLElement | null;
        const value = probe ? `${probe.offsetLeft}px` : '';
        const block = (row.closest('.places-gallery') as HTMLElement | null) ?? row;
        if (block.style.getPropertyValue('--places-indent') === value) continue;
        block.style.setProperty('--places-indent', value);
      }
      // The bottom fades while more lies below (Places.css [data-more]).
      const more = sheet.scrollHeight - sheet.clientHeight - sheet.scrollTop > 1;
      if (sheet.hasAttribute('data-more') !== more) {
        if (more) sheet.setAttribute('data-more', '');
        else sheet.removeAttribute('data-more');
      }
    };
    const content = new MutationObserver(() => { indentPending = true; });
    content.observe(sheet, {childList: true, subtree: true});
    // The outline as last placed, half pixels, and the scroll it was placed at: a frame matching both changes
    // nothing on screen.
    let placedX = NaN;
    let placedY = NaN;
    let placedPoints: number[] = [];
    let placedScroll = -1;
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
      sheet.removeAttribute('data-more');
      shape.style.marginLeft = shape.style.marginTop = shape.style.width = shape.style.height = '';
      shape.style.shapeOutside = '';
      for (const block of sheet.querySelectorAll<HTMLElement>('.places-gallery, .places-photos-row')) {
        block.style.removeProperty('--places-indent');
      }
      indentPending = false;
      for (const property of Object.keys(sheetWritten) as WrittenStyle[]) delete sheetWritten[property];
      for (const property of Object.keys(shapeWritten) as WrittenStyle[]) delete shapeWritten[property];
      placedOnce = false;
      placedX = NaN;
      placedScroll = -1;
    };
    const half = (value: number) => Math.round(value * 2) / 2;
    const unchanged = (outline: GlobeOutline) => {
      if (sheet.scrollTop !== placedScroll) return false;
      if (half(outline.x) !== placedX || half(outline.y) !== placedY) return false;
      if (outline.points.length !== placedPoints.length) return false;
      for (let index = 0; index < placedPoints.length; index += 1) {
        if (half(outline.points[index]) !== placedPoints[index]) return false;
      }
      return true;
    };
    // Writes the panel and the float for this outline at the panel's scroll; `sync` reads the strips back at once.
    const place = (outline: GlobeOutline, sync: boolean) => {
      placedX = half(outline.x);
      placedY = half(outline.y);
      placedScroll = sheet.scrollTop;
      if (placedPoints.length !== outline.points.length) placedPoints = new Array<number>(outline.points.length);
      for (let index = 0; index < placedPoints.length; index += 1) placedPoints[index] = half(outline.points[index]);
      // The column caps the measure where the globe leaves a row free; the float narrows it where it does not.
      const placed = placeLocationSheet(outline, page, 40 * rem, placedScroll, MIN_COLUMN_REM * rem);
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
      if (sync) indent();
      else indentPending = true;
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
      if (indentPending && placedOnce) indent();
      if (unchanged(outline)) return;
      place(outline, false);
    };
    // A scroll moves the float with the text in the same frame, before the frame paints.
    const onScroll = () => {
      const outline = outlineRef.current;
      if (!placedOnce || phone.matches || !outline || outline.points.length < 6) return;
      if (sheet.scrollTop === placedScroll) return;
      place(outline, true);
    };
    // The panel takes no pointer events but its links, so the globe stays draggable under it: a wheel anywhere else
    // on the page scrolls the panel. The photo viewer and its inspection take their own wheel.
    const onWheel = (event: WheelEvent) => {
      if (!placedOnce || phone.matches || event.defaultPrevented || event.ctrlKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target && (sheet.contains(target) || target.closest('.places-viewer, .places-inspection'))) return;
      const unit = event.deltaMode === 1 ? WHEEL_LINE : event.deltaMode === 2 ? sheet.clientHeight : 1;
      sheet.scrollBy({top: event.deltaY * unit, left: 0, behavior: 'instant'});
    };
    measure();
    window.addEventListener('resize', measure);
    sheet.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('wheel', onWheel, {passive: true});
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('resize', measure);
      sheet.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.cancelAnimationFrame(frame);
      content.disconnect();
      clear();
    };
  }, [active, outlineRef, shapeRef, sheetRef]);
}

type WrittenStyle = 'top' | 'left' | 'width' | 'height' | 'right' | 'translate' | 'marginLeft' | 'marginTop'
  | 'shapeOutside';
