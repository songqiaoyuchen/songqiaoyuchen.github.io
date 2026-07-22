import type {HeightGrid} from './bake';

export interface GridPolyline {
  points: number[];
  closed: boolean;
}

export function marchLevel(field: HeightGrid, threshold: number): GridPolyline[] {
  const {data, width, height} = field;
  const pointX: number[] = [];
  const pointY: number[] = [];
  const edgePoints = new Map<number, number>();
  const firstNeighbor: number[] = [];
  const secondNeighbor: number[] = [];

  function pointOnEdge(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    key: number,
  ) {
    let index = edgePoints.get(key);
    if (index !== undefined) return index;

    const first = data[y0 * width + x0];
    const second = data[y1 * width + x1];
    const mix = first === second ? 0.5 : (threshold - first) / (second - first);
    index = pointX.length;
    pointX.push(x0 + (x1 - x0) * mix);
    pointY.push(y0 + (y1 - y0) * mix);
    firstNeighbor.push(-1);
    secondNeighbor.push(-1);
    edgePoints.set(key, index);
    return index;
  }

  function link(first: number, second: number) {
    if (firstNeighbor[first] === -1) firstNeighbor[first] = second;
    else if (secondNeighbor[first] === -1) secondNeighbor[first] = second;
    if (firstNeighbor[second] === -1) firstNeighbor[second] = first;
    else if (secondNeighbor[second] === -1) secondNeighbor[second] = first;
  }

  for (let y = 0; y < height - 1; y++) {
    const row = y * width;
    for (let x = 0; x < width - 1; x++) {
      const bottomLeft = data[row + x];
      const bottomRight = data[row + x + 1];
      const topLeft = data[row + width + x];
      const topRight = data[row + width + x + 1];
      let squareCase = 0;
      if (bottomLeft >= threshold) squareCase |= 1;
      if (bottomRight >= threshold) squareCase |= 2;
      if (topRight >= threshold) squareCase |= 4;
      if (topLeft >= threshold) squareCase |= 8;
      if (squareCase === 0 || squareCase === 15) continue;

      const bottom = () => pointOnEdge(x, y, x + 1, y, 2 * (row + x));
      const top = () => pointOnEdge(
        x,
        y + 1,
        x + 1,
        y + 1,
        2 * (row + width + x),
      );
      const left = () => pointOnEdge(x, y, x, y + 1, 2 * (row + x) + 1);
      const right = () => pointOnEdge(
        x + 1,
        y,
        x + 1,
        y + 1,
        2 * (row + x + 1) + 1,
      );

      switch (squareCase) {
        case 1:
        case 14:
          link(left(), bottom());
          break;
        case 2:
        case 13:
          link(bottom(), right());
          break;
        case 3:
        case 12:
          link(left(), right());
          break;
        case 4:
        case 11:
          link(right(), top());
          break;
        case 6:
        case 9:
          link(bottom(), top());
          break;
        case 7:
        case 8:
          link(left(), top());
          break;
        case 5:
          if ((bottomLeft + bottomRight + topLeft + topRight) * 0.25 >= threshold) {
            link(left(), top());
            link(bottom(), right());
          } else {
            link(left(), bottom());
            link(right(), top());
          }
          break;
        case 10:
          if ((bottomLeft + bottomRight + topLeft + topRight) * 0.25 >= threshold) {
            link(left(), bottom());
            link(right(), top());
          } else {
            link(left(), top());
            link(bottom(), right());
          }
          break;
      }
    }
  }

  const lines: GridPolyline[] = [];
  const visited = new Uint8Array(pointX.length);

  function walk(start: number): GridPolyline {
    const points = [pointX[start], pointY[start]];
    visited[start] = 1;
    let previous = -1;
    let current = start;
    for (;;) {
      const next = firstNeighbor[current] !== previous
        ? firstNeighbor[current]
        : secondNeighbor[current];
      if (next === -1) break;
      if (next === start) {
        points.push(pointX[start], pointY[start]);
        return {points, closed: true};
      }
      if (visited[next]) break;
      visited[next] = 1;
      points.push(pointX[next], pointY[next]);
      previous = current;
      current = next;
    }
    return {points, closed: false};
  }

  for (let index = 0; index < pointX.length; index++) {
    if (visited[index] || secondNeighbor[index] !== -1) continue;
    if (firstNeighbor[index] === -1) {
      visited[index] = 1;
      continue;
    }
    lines.push(walk(index));
  }
  for (let index = 0; index < pointX.length; index++) {
    if (!visited[index]) lines.push(walk(index));
  }
  return lines;
}
