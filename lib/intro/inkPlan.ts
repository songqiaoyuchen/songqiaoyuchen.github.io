// Lays the intro's contour map out for a viewport (components/home/preloader/IntroInk.tsx): the page's drawing
// resolution (the brush's lines stay one stroke wide), the ink simulation's lower one, the mark's rings where its SVG
// stands on screen, and the height field the map's isolines are traced from, level by level as they come due.
// Planned at idle while the terrain loads, since the field is the costly part; the levels are traced on demand.
import {buildMapField, levelCount, traceIsoline, type MapField, type Point} from './mapField';
import {MARK_VIEW_BOX, markRings} from './markPaths';

/** The page's drawing buffer is at most this wide (device pixels); larger screens are interpolated up. */
const MAX_WIDTH = 1920;
/** Simulation texels per page pixel: the ink need not be sharper than this. */
const SIM_PER_PIXEL = 0.5;
/** Field cells per page pixel: the map is traced at this resolution and drawn at the page's. */
const CELLS_PER_PIXEL = 0.35;

export type IntroMapPlan = {
  /** The page's drawing buffer and the brush, device pixels (capped). */
  width: number;
  height: number;
  /** The simulation's texels. */
  simWidth: number;
  simHeight: number;
  /** Page pixels per CSS pixel. */
  scale: number;
  /** The mark's rings in page pixels, outermost first. */
  rings: Point[][];
  /** The mark's stroke, page pixels. */
  lineWidth: number;
  /** The mark's centre, as a share of the width and the height. */
  centre: [number, number];
  /** Isolines in page pixels, level k (1-based) at `level(k)`; `levels` is how many there are. */
  levels: number;
  level: (k: number) => Float32Array;
  /** What the plan was laid out for, so a changed viewport can be told. */
  layout: {viewportWidth: number; viewportHeight: number; markLeft: number; markTop: number; markWidth: number};
};

export type IntroMapLayout = {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  /** The mark's SVG box on screen, CSS px in viewport coordinates. */
  mark: {left: number; top: number; width: number; height: number};
  /** CSS px between the map's lines, and the mark's stroke width. */
  lineSpacing: number;
  lineWidth: number;
  /** How much the map's own landforms bend and break the mark's shape (0..2). */
  wobble: number;
};

/** Whether a plan still fits the viewport and the mark's place on it (a resize while loading replans). */
export function planFits(plan: IntroMapPlan, layout: IntroMapLayout) {
  const {viewportWidth, viewportHeight, markLeft, markTop, markWidth} = plan.layout;
  return viewportWidth === layout.viewportWidth && viewportHeight === layout.viewportHeight
    && Math.abs(markLeft - layout.mark.left) < 1 && Math.abs(markTop - layout.mark.top) < 1
    && Math.abs(markWidth - layout.mark.width) < 1;
}

export function planIntroMap(layout: IntroMapLayout): IntroMapPlan {
  const {viewportWidth, viewportHeight, devicePixelRatio, mark} = layout;
  const scale = Math.min(devicePixelRatio, MAX_WIDTH / Math.max(1, viewportWidth));
  const width = Math.max(2, Math.round(viewportWidth * scale));
  const height = Math.max(2, Math.round(viewportHeight * scale));
  const simWidth = Math.max(2, Math.round(width * SIM_PER_PIXEL));
  const simHeight = Math.max(2, Math.round(height * SIM_PER_PIXEL));
  // The SVG keeps its viewBox's aspect (xMidYMid meet), so one factor places it.
  const markScale = Math.min(mark.width / MARK_VIEW_BOX.width, mark.height / MARK_VIEW_BOX.height);
  const offsetX = mark.left + (mark.width - MARK_VIEW_BOX.width * markScale) / 2;
  const offsetY = mark.top + (mark.height - MARK_VIEW_BOX.height * markScale) / 2;
  const toPixels = ([x, y]: Point): Point => [
    (offsetX + (x - MARK_VIEW_BOX.x) * markScale) * scale,
    (offsetY + (y - MARK_VIEW_BOX.y) * markScale) * scale,
  ];
  const rings = markRings().map((ring) => ring.map(toPixels));
  const centreX = offsetX + MARK_VIEW_BOX.width * markScale / 2;
  const centreY = offsetY + MARK_VIEW_BOX.height * markScale / 2;

  const fieldWidth = Math.max(2, Math.round(width * CELLS_PER_PIXEL));
  const fieldHeight = Math.max(2, Math.round(height * CELLS_PER_PIXEL));
  const cellsPerPixel = fieldWidth / width;
  const outline = rings[0].map(([x, y]): Point => [x * cellsPerPixel, y * cellsPerPixel]);
  const field: MapField = buildMapField(fieldWidth, fieldHeight, outline, {
    scale: scale * cellsPerPixel, wobble: layout.wobble,
  });
  const spacing = layout.lineSpacing * scale * cellsPerPixel;
  const levels = levelCount(field, spacing);
  const traced = new Map<number, Float32Array>();
  const pixelsPerCell = 1 / cellsPerPixel;
  const level = (k: number) => {
    let segments = traced.get(k);
    if (!segments) {
      segments = traceIsoline(field, k * spacing);
      for (let index = 0; index < segments.length; index++) segments[index] *= pixelsPerCell;
      traced.set(k, segments);
    }
    return segments;
  };

  return {
    width,
    height,
    simWidth,
    simHeight,
    scale,
    rings,
    lineWidth: layout.lineWidth * scale,
    centre: [centreX / viewportWidth, centreY / viewportHeight],
    levels,
    level,
    layout: {viewportWidth, viewportHeight, markLeft: mark.left, markTop: mark.top, markWidth: mark.width},
  };
}
