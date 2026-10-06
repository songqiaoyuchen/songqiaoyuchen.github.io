// Polyline helpers: Ramer-Douglas-Peucker simplification, Chaikin smoothing and even resampling.
export function simplifyPolyline(
  points: number[] | Float32Array,
  epsilon: number,
) {
  const pointCount = points.length / 2;
  if (pointCount <= 2) return Array.from(points);

  const keep = new Uint8Array(pointCount);
  keep[0] = 1;
  keep[pointCount - 1] = 1;
  const stack: Array<[number, number]> = [[0, pointCount - 1]];

  while (stack.length > 0) {
    const range = stack.pop();
    if (!range) break;
    const [start, end] = range;
    const startX = points[start * 2];
    const startY = points[start * 2 + 1];
    const deltaX = points[end * 2] - startX;
    const deltaY = points[end * 2 + 1] - startY;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    let furthestIndex = -1;
    let furthestDistance = epsilon * epsilon;

    for (let index = start + 1; index < end; index++) {
      const pointX = points[index * 2] - startX;
      const pointY = points[index * 2 + 1] - startY;
      let distanceSquared: number;
      if (lengthSquared === 0) {
        distanceSquared = pointX * pointX + pointY * pointY;
      } else {
        const mix = Math.max(
          0,
          Math.min(1, (pointX * deltaX + pointY * deltaY) / lengthSquared),
        );
        const errorX = pointX - mix * deltaX;
        const errorY = pointY - mix * deltaY;
        distanceSquared = errorX * errorX + errorY * errorY;
      }
      if (distanceSquared > furthestDistance) {
        furthestDistance = distanceSquared;
        furthestIndex = index;
      }
    }
    if (furthestIndex >= 0) {
      keep[furthestIndex] = 1;
      stack.push([start, furthestIndex], [furthestIndex, end]);
    }
  }

  const output: number[] = [];
  for (let index = 0; index < pointCount; index++) {
    if (keep[index]) output.push(points[index * 2], points[index * 2 + 1]);
  }
  return output;
}

export function smoothPolyline(points: number[], iterations: number, closed: boolean) {
  let current = points;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const pointCount = current.length / 2;
    if (pointCount < 3) return current;
    const output: number[] = [];

    if (closed) {
      const uniqueCount = pointCount - 1;
      for (let index = 0; index < uniqueCount; index++) {
        const next = (index + 1) % uniqueCount;
        const x0 = current[index * 2];
        const y0 = current[index * 2 + 1];
        const x1 = current[next * 2];
        const y1 = current[next * 2 + 1];
        output.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
        output.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
      }
      output.push(output[0], output[1]);
    } else {
      output.push(current[0], current[1]);
      for (let index = 0; index < pointCount - 1; index++) {
        const x0 = current[index * 2];
        const y0 = current[index * 2 + 1];
        const x1 = current[index * 2 + 2];
        const y1 = current[index * 2 + 3];
        output.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25);
        output.push(x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75);
      }
      output.push(current[(pointCount - 1) * 2], current[(pointCount - 1) * 2 + 1]);
    }
    current = output;
  }
  return current;
}

export function resamplePolyline(points: number[], spacing: number, closed: boolean) {
  const pointCount = points.length / 2;
  if (pointCount < 2) return points;

  let totalLength = 0;
  for (let index = 1; index < pointCount; index++) {
    totalLength += Math.hypot(
      points[index * 2] - points[index * 2 - 2],
      points[index * 2 + 1] - points[index * 2 - 1],
    );
  }
  const outputCount = Math.max(closed ? 4 : 2, Math.round(totalLength / spacing));
  const step = totalLength / outputCount;
  const output = [points[0], points[1]];
  let targetLength = step;
  let accumulatedLength = 0;

  for (let index = 1; index < pointCount; index++) {
    const x0 = points[index * 2 - 2];
    const y0 = points[index * 2 - 1];
    const x1 = points[index * 2];
    const y1 = points[index * 2 + 1];
    const segmentLength = Math.hypot(x1 - x0, y1 - y0);
    while (accumulatedLength + segmentLength >= targetLength
      && output.length / 2 < outputCount) {
      const mix = (targetLength - accumulatedLength) / segmentLength;
      output.push(x0 + (x1 - x0) * mix, y0 + (y1 - y0) * mix);
      targetLength += step;
    }
    accumulatedLength += segmentLength;
  }
  output.push(points[(pointCount - 1) * 2], points[(pointCount - 1) * 2 + 1]);
  return output;
}
