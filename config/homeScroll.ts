export type RoutePoint = {
  x: number;
  y: number;
  year: string;
  label: string;
};

/**
 * Stage-1 route controls in the 1000 x 600 SVG coordinate system.
 * These are intentionally kept as four plain points so the route can be
 * retuned against a new terrain crop without touching the component.
 */
export const EXPERIENCE_ROUTE_POINTS: RoutePoint[] = [
  { x: 90, y: 318, year: '2019', label: 'first website' },
  { x: 365, y: 282, year: '2021', label: 'NUS' },
  { x: 650, y: 326, year: '2024', label: 'internship' },
  { x: 910, y: 276, year: '2026', label: 'exploring' },
];

export function catmullRomPath(points: RoutePoint[]) {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

/** The diagram boundaries continue the same route beyond its first/last stop. */
export function extendedRoutePath(points: RoutePoint[]) {
  if (points.length < 2) return catmullRomPath(points);

  const first = points[0];
  const second = points[1];
  const before: RoutePoint = {
    ...first,
    x: -60,
    y: first.y - ((second.y - first.y) * 150) / (second.x - first.x),
  };
  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const after: RoutePoint = {
    ...last,
    x: 1060,
    y: last.y + ((last.y - previous.y) * 150) / (last.x - previous.x),
  };

  return catmullRomPath([before, ...points, after]);
}
