import type {Isoline} from './isolines';

/** Triangular cross-section: the smallest tube that has a silhouette at every angle. */
const SEGMENT_COUNT = 3;

export type ContourTubeBuffers = {
  index: Uint32Array;
  lineId: Float32Array;
  major: Float32Array;
  normal: Float32Array;
  position: Float32Array;
  shadow: Float32Array;
  t: Float32Array;
  totalLength: Float32Array;
  travelDirection: Float32Array;
};

export function buildContourTubeBuffers(lines: Isoline[]): ContourTubeBuffers {
  let vertexCount = 0;
  let indexCount = 0;
  for (const line of lines) {
    const pointCount = line.points.length / 2;
    vertexCount += pointCount * SEGMENT_COUNT;
    indexCount += (pointCount - 1) * SEGMENT_COUNT * 6;
  }

  const position = new Float32Array(vertexCount * 3);
  const normal = new Float32Array(vertexCount * 3);
  const t = new Float32Array(vertexCount);
  const totalLength = new Float32Array(vertexCount);
  const lineId = new Float32Array(vertexCount);
  const major = new Float32Array(vertexCount);
  const travelDirection = new Float32Array(vertexCount);
  const shadow = new Float32Array(vertexCount);
  const index = new Uint32Array(indexCount);

  let vertexCursor = 0;
  let indexCursor = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const points = line.points;
    const pointCount = points.length / 2;
    const y = line.levelValue;
    let arc = 0;

    for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      const x = points[pointIndex * 2];
      const z = points[pointIndex * 2 + 1];

      if (pointIndex > 0) {
        arc += Math.hypot(
          x - points[pointIndex * 2 - 2],
          z - points[pointIndex * 2 - 1],
        );
      }

      let previousIndex = pointIndex - 1;
      let nextIndex = pointIndex + 1;
      if (line.closed) {
        if (previousIndex < 0) previousIndex = pointCount - 2;
        if (nextIndex > pointCount - 1) nextIndex = 1;
      } else {
        if (previousIndex < 0) previousIndex = 0;
        if (nextIndex > pointCount - 1) nextIndex = pointCount - 1;
      }
      let tangentX = points[nextIndex * 2] - points[previousIndex * 2];
      let tangentZ = points[nextIndex * 2 + 1] - points[previousIndex * 2 + 1];
      const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
      tangentX /= tangentLength;
      tangentZ /= tangentLength;

      const sideX = tangentZ;
      const sideZ = -tangentX;

      for (let sideIndex = 0; sideIndex < SEGMENT_COUNT; sideIndex++) {
        const theta = (sideIndex / SEGMENT_COUNT) * Math.PI * 2;
        const up = Math.cos(theta);
        const side = Math.sin(theta);

        position[vertexCursor * 3] = x;
        position[vertexCursor * 3 + 1] = y;
        position[vertexCursor * 3 + 2] = z;
        normal[vertexCursor * 3] = sideX * side;
        normal[vertexCursor * 3 + 1] = up;
        normal[vertexCursor * 3 + 2] = sideZ * side;
        t[vertexCursor] = arc;
        totalLength[vertexCursor] = line.totalLength;
        lineId[vertexCursor] = lineIndex;
        major[vertexCursor] = line.major ? 1 : 0;
        travelDirection[vertexCursor] = line.travelDirection;
        shadow[vertexCursor] = line.shadow ? 1 : 0;

        if (pointIndex < pointCount - 1) {
          const wrap = sideIndex === SEGMENT_COUNT - 1 ? 1 - SEGMENT_COUNT : 1;
          index[indexCursor++] = vertexCursor;
          index[indexCursor++] = vertexCursor + wrap;
          index[indexCursor++] = vertexCursor + SEGMENT_COUNT;
          index[indexCursor++] = vertexCursor + wrap;
          index[indexCursor++] = vertexCursor + SEGMENT_COUNT + wrap;
          index[indexCursor++] = vertexCursor + SEGMENT_COUNT;
        }
        vertexCursor++;
      }
    }
  }

  return {
    index,
    lineId,
    major,
    normal,
    position,
    shadow,
    t,
    totalLength,
    travelDirection,
  };
}

export function getContourTubeTransferables(buffers: ContourTubeBuffers) {
  return Object.values(buffers).map((array) => array.buffer);
}
