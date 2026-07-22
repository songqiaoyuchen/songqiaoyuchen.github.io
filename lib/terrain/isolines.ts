import type {HeightGrid} from './bake';
import {marchLevel} from './marchingSquares';
import {resamplePolyline, simplifyPolyline, smoothPolyline} from './polyline';

export interface Isoline {
  points: Float32Array;
  level: number;
  levelValue: number;
  major: boolean;
  shadow: boolean;
  travelDirection: number;
  closed: boolean;
  totalLength: number;
}

export interface IsolineOptions {
  levels: number;
  contrast: number;
  seaLevel: number;
  planeSize: number;
  downsample?: number;
  rdpEpsilon?: number;
  chaikinIterations?: number;
  resampleSpacing?: number;
  minLength?: number;
  majorEvery?: number;
  majorMinHeight?: number;
  spacingJitter?: number;
  shadowOffset?: number;
  shadowChance?: number;
}

interface LevelEntry {
  levelValue: number;
  level: number;
  major: boolean;
  shadow: boolean;
}

export function extractIsolines(grid: HeightGrid, options: IsolineOptions): Isoline[] {
  const {
    levels,
    contrast,
    seaLevel,
    planeSize,
    downsample = 2,
    rdpEpsilon = 0.012,
    chaikinIterations = 3,
    resampleSpacing = 0.06,
    minLength = 0.5,
    majorEvery = 3,
    majorMinHeight = 0,
    spacingJitter = 0,
    shadowOffset = 0,
    shadowChance = 1,
  } = options;
  const field = downsampleGrid(grid, downsample);
  const worldPerGrid = planeSize / field.width;
  const random = makeRandom(0x51ab7e);

  let rawMin = Infinity;
  let rawMax = -Infinity;
  for (const value of field.data) {
    rawMin = Math.min(rawMin, value);
    rawMax = Math.max(rawMax, value);
  }
  const toVisual = (raw: number) => Math.min(
    1,
    Math.max(
      0,
      (Math.pow(Math.max(raw, 0), contrast) - seaLevel)
        / Math.max(1 - seaLevel, 0.0001),
    ),
  );
  const visualMin = toVisual(rawMin);
  const visualSpan = toVisual(rawMax) - visualMin;
  const gaps = new Float64Array(levels);
  let gapTotal = 0;
  for (let level = 0; level < levels; level++) {
    gaps[level] = 1 + spacingJitter * (random() * 2 - 1);
    gapTotal += gaps[level];
  }

  const entries: LevelEntry[] = [];
  let accumulatedGap = 0;
  for (let level = 0; level < levels; level++) {
    const levelValue = visualMin
      + visualSpan * ((accumulatedGap + gaps[level] * 0.5) / gapTotal);
    const major = level % majorEvery === 0 && levelValue >= majorMinHeight;
    entries.push({levelValue, level, major, shadow: false});
    if (shadowOffset > 0 && major && random() < shadowChance) {
      const offset = shadowOffset * (0.75 + random() * 0.5);
      const companion = levelValue - visualSpan * (gaps[level] / gapTotal) * offset;
      if (companion > visualMin) {
        entries.push({levelValue: companion, level, major: false, shadow: true});
      }
    }
    accumulatedGap += gaps[level];
  }

  const directions = new Int8Array(levels);
  let direction = 1;
  for (let level = 0; level < levels;) {
    const groupSize = 2 + Math.floor(random() * 3);
    const end = Math.min(level + groupSize, levels);
    for (; level < end; level++) directions[level] = direction;
    direction = -direction;
  }

  const isolines: Isoline[] = [];
  for (const entry of entries) {
    const rawThreshold = Math.pow(
      seaLevel + entry.levelValue * Math.max(1 - seaLevel, 0.0001),
      1 / contrast,
    );
    if (rawThreshold >= 1) continue;

    for (const line of marchLevel(field, rawThreshold)) {
      let gridPoints = simplifyPolyline(line.points, rdpEpsilon / worldPerGrid);
      gridPoints = smoothPolyline(gridPoints, chaikinIterations, line.closed);
      gridPoints = resamplePolyline(
        gridPoints,
        resampleSpacing / worldPerGrid,
        line.closed,
      );
      if (gridPoints.length < 6) continue;

      const points = toWorldPoints(gridPoints, field.width, field.height, planeSize);
      const totalLength = getPolylineLength(points);
      if (totalLength < minLength) continue;
      isolines.push({
        ...entry,
        points,
        travelDirection: directions[entry.level],
        closed: line.closed,
        totalLength,
      });
    }
  }
  return isolines;
}

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function downsampleGrid(grid: HeightGrid, factor: number): HeightGrid {
  if (factor <= 1) return grid;
  const width = Math.floor(grid.width / factor);
  const height = Math.floor(grid.height / factor);
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let blockY = 0; blockY < factor; blockY++) {
        const row = (y * factor + blockY) * grid.width + x * factor;
        for (let blockX = 0; blockX < factor; blockX++) {
          sum += grid.data[row + blockX];
        }
      }
      data[y * width + x] = sum / (factor * factor);
    }
  }
  return {data, width, height};
}

function toWorldPoints(
  gridPoints: number[],
  width: number,
  height: number,
  planeSize: number,
) {
  const points = new Float32Array(gridPoints.length);
  for (let index = 0; index < gridPoints.length; index += 2) {
    points[index] = ((gridPoints[index] + 0.5) / width - 0.5) * planeSize;
    points[index + 1] = -(
      ((gridPoints[index + 1] + 0.5) / height - 0.5) * planeSize
    );
  }
  return points;
}

function getPolylineLength(points: Float32Array) {
  let length = 0;
  for (let index = 2; index < points.length; index += 2) {
    length += Math.hypot(
      points[index] - points[index - 2],
      points[index + 1] - points[index - 1],
    );
  }
  return length;
}
