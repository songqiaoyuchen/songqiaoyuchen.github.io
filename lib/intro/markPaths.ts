// The preloader's contour mark: five closed rings (outermost first, the summit's triangle last) as SVG path data,
// shared by the SVG (MountainContour) and the intro's ink, which draws the same rings as its first strokes and grows
// the contour map out of the outermost one (lib/intro/mapField.ts).

export type Point = readonly [number, number];

/** The SVG viewBox the paths are drawn in. */
export const MARK_VIEW_BOX = {x: 300, y: 255, width: 175, height: 155} as const;

export const MARK_PATHS = [
  'M313.21762 293.91324l18.95641-20.0001 30.43479-6.95652 26.95653 4.34783 ' +
    '28.69566-.86957 20.86957-2.6087 20.86957 10.43479 7.82609 29.56523-7.82609 ' +
    '25.2174-20.86957 20.00001-6.95652 28.69566-14.78261 14.78261-14.78261 ' +
    '4.34783-18.26088-8.69566-12.17392-18.26088-15.65218-22.6087-28.69566-10.43479 ' +
    '-14.78261-24.34783.17403-22.60861Z',
  'M335.82632 303.47846l15.47815 27.826 22.6087 4.34783 11.30435 14.78261 ' +
    '6.95652 20.86957 12.17392 13.04348 11.30435.86957 13.04348-19.13044 ' +
    '6.08696-24.34783 11.30435-19.13044 9.56522-18.26088-6.95652-20.86957 ' +
    '-11.30435-5.21739-28.69566 3.47826-14.78261.86957-27.8261-2.6087 ' +
    '-20.86957 5.21739-9.39119 18.26097Z',
  'M365.21752 324.34794l25.2174 5.21739 12.17392 13.91305 4.34783 24.34783 ' +
    '6.08696 1.73913 6.95652-25.2174 13.91305-17.39131 9.56522-18.26088 ' +
    '-6.08696-15.65218-16.52175-3.47826-17.39131 6.95652-20.86957-1.73913 ' +
    '-20.00001-1.73913-5.65218 18.26088 8.26087 13.04348Z',
  'M378.43503 307.82629l7.65206 7.826 14.78261 3.47826 11.30435 19.13044 ' +
    '11.30435-14.78261 6.08696-13.04348-7.82609-6.95652-13.91305 4.34783 ' +
    '-22.6087-5.21739-6.7825 5.21749Z',
  'M408.5609 319.40267l4.78261-7.8261 4.78261 7.8261h-9.56522Z',
] as const;

/** One ring's path (`M x y`, then relative `l` pairs and `h`, closed with `Z`) as a closed polyline. */
export function parseMarkPath(d: string): Point[] {
  // Split the commands out, and the SVG shorthands: a sign starts a number, and a second decimal point does too.
  const tokens = d
    .replace(/[MlhZ]/g, (command) => ` ${command} `)
    .replace(/-/g, ' -')
    .replace(/(\.\d+)(?=\.)/g, '$1 ')
    .trim()
    .split(/\s+/);
  const points: Point[] = [];
  let mode = 'M';
  let x = 0;
  let y = 0;
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];
    if (token === 'M' || token === 'l' || token === 'h' || token === 'Z') {
      mode = token;
      index += 1;
      continue;
    }
    if (mode === 'M') {
      x = Number(tokens[index]);
      y = Number(tokens[index + 1]);
      index += 2;
      mode = 'l';
    } else if (mode === 'l') {
      x += Number(tokens[index]);
      y += Number(tokens[index + 1]);
      index += 2;
    } else if (mode === 'h') {
      x += Number(tokens[index]);
      index += 1;
    } else {
      index += 1;
      continue;
    }
    points.push([x, y]);
  }
  if (points.length > 0) points.push(points[0]);
  return points;
}

let rings: Point[][] | null = null;

/** The five rings as closed polylines in the viewBox's units, outermost first. */
export function markRings(): Point[][] {
  rings ??= MARK_PATHS.map(parseMarkPath);
  return rings;
}
