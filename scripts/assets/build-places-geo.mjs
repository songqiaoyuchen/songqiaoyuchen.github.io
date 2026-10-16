// Bakes Places geography into small files (lib/scene/places.ts holds the formats):
//
//   node scripts/assets/build-places-geo.mjs coast <lines.geojson> [<more.geojson> ...] [--tolerance-km 2]
//     Coastlines and lake shores (LineString/MultiLineString, or Polygon/MultiPolygon rings, e.g. Natural Earth
//     110m coastline and lakes) simplified to the tolerance and written to public/places/coast.bin as Int16 pairs.
//
//   node scripts/assets/build-places-geo.mjs elevation <equirectangular image> [--width 2048]
//     A grayscale elevation image (sea black, higher ground lighter, e.g. NASA's gebco_08_rev_elev) resized to
//     public/places/elevation.png, 8-bit grey, width x width/2.
//
//   node scripts/assets/build-places-geo.mjs region <lon> <lat> [--km 600] [--size 1024]
//     The ground around the place the landscape lands on, for the zoom out: Terrarium elevation tiles
//     (AWS Open Data, keyless; SRTM/GMTED/ETOPO1, attribution required) fetched and resampled onto a local
//     east/north grid centred on the place, written to public/places/region.png (8-bit grey, metres linear
//     from 0 to REGION_MAX_M) with public/places/region.json describing it.
//
//   node scripts/assets/build-places-geo.mjs ground <location id> <lon> <lat> [--km 3600] [--size 1536]
//     A location's own sharper ground (components/scene/places/useLocationGround.ts): Terrarium elevation as for `region`, resampled onto the
//     globe's own tangent grid about the place (the offsets globe.frag reads: east and north components of the
//     direction, over the half-width's angle) in GROUND_STEP_M steps across two bytes (high in red, low in green),
//     written as lossless WebP to public/places/ground/<location id>.webp with a .json describing it. Centre it on the
//     middle of the box about the location's places, the centre of its zoom.
//
//   node scripts/assets/build-places-geo.mjs track <location id> <a.gpx> [<b.gpx> ...] [--tolerance-km 0.05]
//     Each GPX recording becomes one segment of the location, simplified; written to public/places/tracks/<id>.json
//     as {"segments": [[[lon, lat], ...], ...]} ready to paste into data/places.ts.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {encodeLines} from '../../lib/scene/places.ts';

const EARTH_RADIUS_KM = 6371;
const DEG = Math.PI / 180;

function parseArgs(argv) {
  const positional = [];
  const options = {toleranceKm: null, width: 2048, km: null, size: null};
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--tolerance-km') options.toleranceKm = Number(argv[++index]);
    else if (argv[index] === '--width') options.width = Number(argv[++index]);
    else if (argv[index] === '--km') options.km = Number(argv[++index]);
    else if (argv[index] === '--size') options.size = Number(argv[++index]);
    else positional.push(argv[index]);
  }
  return {positional, options};
}

const TERRARIUM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const TILE = 256;
export const REGION_MAX_M = 8000;
const GROUND_STEP_M = 2;

/** Web Mercator tile coordinates (fractional) of a place at a zoom level. */
export function mercatorTile(lon, lat, zoom) {
  const scale = 2 ** zoom;
  const x = (lon + 180) / 360 * scale;
  const phi = lat * DEG;
  const y = (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2 * scale;
  return {x, y};
}

/** The zoom whose tiles come closest to the wanted metres per pixel at a latitude. */
export function zoomForResolution(metresPerPixel, lat) {
  const equator = 40075016.686;
  return Math.max(0, Math.min(15, Math.round(Math.log2(equator * Math.cos(lat * DEG) / TILE / metresPerPixel))));
}

/**
 * Terrarium tiles at `zoom` covering a box of places (with a margin tile each side) fetched into one mosaic: a
 * bilinear sampler of (lon, lat) -> metres, and how many tiles it took.
 */
async function terrariumSampler(sharp, west, east, north, south, zoom) {
  const corner = mercatorTile(west, north, zoom);
  const far = mercatorTile(east, south, zoom);
  const x0 = Math.floor(corner.x) - 1;
  const x1 = Math.floor(far.x) + 1;
  const y0 = Math.max(0, Math.floor(corner.y) - 1);
  const y1 = Math.min(2 ** zoom - 1, Math.floor(far.y) + 1);
  const columns = x1 - x0 + 1;
  const rows = y1 - y0 + 1;
  const mosaicWidth = columns * TILE;
  const mosaic = new Float32Array(mosaicWidth * rows * TILE);
  let fetched = 0;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const wrapped = ((tx % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
      const url = `${TERRARIUM_URL}/${zoom}/${wrapped}/${ty}.png`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      const {data, info} = await sharp(Buffer.from(await response.arrayBuffer()))
        .raw().toBuffer({resolveWithObject: true});
      if (info.width !== TILE || info.height !== TILE) throw new Error(`${url}: unexpected size`);
      for (let py = 0; py < TILE; py++) {
        for (let px = 0; px < TILE; px++) {
          const offset = (py * TILE + px) * info.channels;
          // Terrarium: metres = R * 256 + G + B / 256 - 32768.
          const metres = data[offset] * 256 + data[offset + 1] + data[offset + 2] / 256 - 32768;
          mosaic[((ty - y0) * TILE + py) * mosaicWidth + (tx - x0) * TILE + px] = metres;
        }
      }
      fetched++;
    }
  }
  const sampler = (sampleLon, sampleLat) => {
    const tile = mercatorTile(sampleLon, sampleLat, zoom);
    const fx = (tile.x - x0) * TILE - 0.5;
    const fy = (tile.y - y0) * TILE - 0.5;
    const ix = Math.min(mosaicWidth - 2, Math.max(0, Math.floor(fx)));
    const iy = Math.min(rows * TILE - 2, Math.max(0, Math.floor(fy)));
    const ax = Math.min(1, Math.max(0, fx - ix));
    const ay = Math.min(1, Math.max(0, fy - iy));
    const at = (x, y) => mosaic[y * mosaicWidth + x];
    const top = at(ix, iy) * (1 - ax) + at(ix + 1, iy) * ax;
    const bottom = at(ix, iy + 1) * (1 - ax) + at(ix + 1, iy + 1) * ax;
    return top * (1 - ay) + bottom * ay;
  };
  return {sampler, fetched};
}

/**
 * The places of the globe's tangent grid about (lon, lat): `size` x `size` cells, rows north to south, whose
 * east and north components of the direction run over +-halfAngle (radians), as globe.frag reads the ground.
 */
export function tangentGrid(lon, lat, halfAngle, size) {
  const anchor = toUnit([lon, lat]);
  // east = up x anchor, north = anchor x east (PlacesGlobe's patch frame).
  const eastLength = Math.hypot(anchor[2], anchor[0]);
  const east = [anchor[2] / eastLength, 0, -anchor[0] / eastLength];
  const north = [
    anchor[1] * east[2] - anchor[2] * east[1],
    anchor[2] * east[0] - anchor[0] * east[2],
    anchor[0] * east[1] - anchor[1] * east[0],
  ];
  const places = new Float64Array(size * size * 2);
  for (let row = 0; row < size; row++) {
    const y = (1 - (row + 0.5) / size * 2) * halfAngle;
    for (let column = 0; column < size; column++) {
      const x = ((column + 0.5) / size * 2 - 1) * halfAngle;
      const up = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      const d = [0, 1, 2].map((axis) => anchor[axis] * up + east[axis] * x + north[axis] * y);
      places[(row * size + column) * 2] = Math.atan2(d[0], d[2]) / DEG;
      places[(row * size + column) * 2 + 1] = Math.asin(Math.max(-1, Math.min(1, d[1]))) / DEG;
    }
  }
  return places;
}

/** Builds a local east/north elevation grid from a sampler of (lon, lat) -> metres. */
export function sampleRegion(sampler, lon, lat, km, size) {
  const data = new Float32Array(size * size);
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos(lat * DEG);
  for (let row = 0; row < size; row++) {
    const north = (0.5 - (row + 0.5) / size) * km;
    for (let column = 0; column < size; column++) {
      const east = ((column + 0.5) / size - 0.5) * km;
      data[row * size + column] = sampler(lon + east / kmPerDegLon, lat + north / kmPerDegLat);
    }
  }
  return data;
}

function toUnit([lon, lat]) {
  const phi = lat * DEG;
  const lambda = lon * DEG;
  return [Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda)];
}

/** Distance of a point from the chord between two others, in sphere radii (close to the arc distance here). */
function chordDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const lengthSq = dx * dx + dy * dy + dz * dz;
  let t = 0;
  if (lengthSq > 0) {
    t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy + (point[2] - start[2]) * dz) / lengthSq;
    t = Math.min(1, Math.max(0, t));
  }
  const px = start[0] + dx * t - point[0];
  const py = start[1] + dy * t - point[1];
  const pz = start[2] + dz * t - point[2];
  return Math.hypot(px, py, pz);
}

/** Douglas–Peucker on the sphere; tolerance in km. */
export function simplifyLine(line, toleranceKm) {
  if (line.length <= 2) return line;
  const tolerance = toleranceKm / EARTH_RADIUS_KM;
  const units = line.map(toUnit);
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let farthest = -1;
    let farthestDistance = tolerance;
    for (let index = first + 1; index < last; index++) {
      const distance = chordDistance(units[index], units[first], units[last]);
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthest = index;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = 1;
    stack.push([first, farthest], [farthest, last]);
  }
  return line.filter((_, index) => keep[index]);
}

/** Every line in a GeoJSON file: LineStrings, MultiLineStrings and polygon rings. */
export function geoJsonLines(geoJson) {
  const lines = [];
  const visit = (geometry) => {
    if (!geometry) return;
    switch (geometry.type) {
      case 'LineString': lines.push(geometry.coordinates); break;
      case 'MultiLineString': lines.push(...geometry.coordinates); break;
      case 'Polygon': lines.push(...geometry.coordinates); break;
      case 'MultiPolygon': geometry.coordinates.forEach((polygon) => lines.push(...polygon)); break;
      case 'GeometryCollection': geometry.geometries.forEach(visit); break;
      default: break;
    }
  };
  if (geoJson.type === 'FeatureCollection') geoJson.features.forEach((feature) => visit(feature.geometry));
  else if (geoJson.type === 'Feature') visit(geoJson.geometry);
  else visit(geoJson);
  return lines.map((line) => line.map(([lon, lat]) => [lon, lat]));
}

/** Track points of a GPX file, in order, as [lon, lat]. */
export function gpxTrack(xml) {
  const points = [];
  const pattern = /<trkpt\b([^>]*)>/g;
  for (const match of xml.matchAll(pattern)) {
    const lat = /\blat="([-\d.]+)"/.exec(match[1]);
    const lon = /\blon="([-\d.]+)"/.exec(match[1]);
    if (lat && lon) points.push([Number(lon[1]), Number(lat[1])]);
  }
  return points;
}

const round = (value) => Math.round(value * 10000) / 10000;

async function main() {
  const {positional, options} = parseArgs(process.argv.slice(2));
  const [command, ...rest] = positional;
  const root = process.cwd();

  if (command === 'coast') {
    if (!rest.length) throw new Error('coast needs at least one GeoJSON file');
    const tolerance = options.toleranceKm ?? 2;
    const lines = [];
    for (const source of rest) {
      lines.push(...geoJsonLines(JSON.parse(await fs.readFile(source, 'utf8')))
        .map((line) => simplifyLine(line, tolerance))
        .filter((line) => line.length >= 2));
    }
    const encoded = encodeLines(lines);
    const target = path.join(root, 'public', 'places', 'coast.bin');
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.writeFile(target, Buffer.from(encoded.buffer));
    const points = lines.reduce((sum, line) => sum + line.length, 0);
    console.log(`coast: ${lines.length} lines, ${points} points, ${encoded.byteLength} bytes -> ${target}`);
    return;
  }

  if (command === 'elevation') {
    const [source] = rest;
    if (!source) throw new Error('elevation needs an image file');
    // sharp ships with Next; loaded here only so the rest of the script needs nothing beyond node.
    const {default: sharp} = await import('sharp');
    const width = options.width;
    const target = path.join(root, 'public', 'places', 'elevation.png');
    await fs.mkdir(path.dirname(target), {recursive: true});
    const info = await sharp(source, {limitInputPixels: false})
      .resize(width, width / 2, {fit: 'fill', kernel: 'lanczos3'})
      .greyscale()
      .png({compressionLevel: 9, palette: false})
      .toFile(target);
    console.log(`elevation: ${info.width}x${info.height}, ${info.size} bytes -> ${target}`);
    return;
  }

  if (command === 'region') {
    const lon = Number(rest[0]);
    const lat = Number(rest[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error('region needs <lon> <lat>');
    const km = options.km ?? 600;
    const size = options.size ?? 1024;
    const {default: sharp} = await import('sharp');
    const zoom = zoomForResolution(km * 1000 / size, lat);
    const kmPerDegLat = 111.32;
    const kmPerDegLon = 111.32 * Math.cos(lat * DEG);
    const half = km / 2;
    const {sampler, fetched} = await terrariumSampler(sharp, lon - half / kmPerDegLon, lon + half / kmPerDegLon,
      lat + half / kmPerDegLat, lat - half / kmPerDegLat, zoom);
    const grid = sampleRegion(sampler, lon, lat, km, size);
    const pixels = Buffer.alloc(size * size);
    let min = Infinity;
    let max = -Infinity;
    for (let index = 0; index < grid.length; index++) {
      const metres = Math.max(0, grid[index]);
      min = Math.min(min, grid[index]);
      max = Math.max(max, grid[index]);
      pixels[index] = Math.round(Math.min(1, metres / REGION_MAX_M) * 255);
    }
    const anchorMetres = sampler(lon, lat);
    const target = path.join(root, 'public', 'places', 'region.png');
    await fs.mkdir(path.dirname(target), {recursive: true});
    await sharp(pixels, {raw: {width: size, height: size, channels: 1}})
      .png({compressionLevel: 9}).toFile(target);
    const meta = {lon, lat, km, size, zoom, maxMetres: REGION_MAX_M, anchorMetres: Math.round(anchorMetres),
      source: 'Terrain Tiles on AWS (Mapzen/Tilezen Terrarium: SRTM, GMTED2010, ETOPO1)'};
    await fs.writeFile(path.join(root, 'public', 'places', 'region.json'), `${JSON.stringify(meta, null, 2)}\n`);
    console.log(`region: ${fetched} tiles at z${zoom}, ${size}x${size} over ${km} km, elevation `
      + `${Math.round(min)}..${Math.round(max)} m, anchor ${Math.round(anchorMetres)} m -> ${target}`);
    return;
  }

  if (command === 'ground') {
    const [id] = rest;
    const lon = Number(rest[1]);
    const lat = Number(rest[2]);
    if (!id || !Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error('ground needs <location id> <lon> <lat>');
    const km = options.km ?? 3600;
    const size = options.size ?? 1536;
    const {default: sharp} = await import('sharp');
    const halfAngle = km / 2 / EARTH_RADIUS_KM;
    const places = tangentGrid(lon, lat, halfAngle, size);
    let west = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    let south = Infinity;
    for (let index = 0; index < places.length; index += 2) {
      // Longitudes about the centre's, so a box across the antimeridian stays one box.
      const relative = ((places[index] - lon + 540) % 360) - 180;
      west = Math.min(west, lon + relative);
      east = Math.max(east, lon + relative);
      north = Math.max(north, places[index + 1]);
      south = Math.min(south, places[index + 1]);
    }
    // The finest tiles the grid can use: its pixel at the box's widest latitude.
    const zoom = zoomForResolution(km * 1000 / size, Math.min(Math.abs(north), Math.abs(south)));
    const {sampler, fetched} = await terrariumSampler(sharp, west, east, Math.min(north, 85), Math.max(south, -85),
      zoom);
    const pixels = Buffer.alloc(size * size * 3);
    let min = Infinity;
    let max = -Infinity;
    for (let cell = 0; cell < size * size; cell++) {
      const metres = sampler(places[cell * 2], places[cell * 2 + 1]);
      min = Math.min(min, metres);
      max = Math.max(max, metres);
      const level = Math.min(65535, Math.round(Math.max(0, metres) / GROUND_STEP_M));
      pixels[cell * 3] = level >> 8;
      pixels[cell * 3 + 1] = level & 255;
    }
    const folder = path.join(root, 'public', 'places', 'ground');
    await fs.mkdir(folder, {recursive: true});
    const target = path.join(folder, `${id}.webp`);
    await sharp(pixels, {raw: {width: size, height: size, channels: 3}}).webp({lossless: true, effort: 6})
      .toFile(target);
    const meta = {lon, lat, km, size, zoom, stepMetres: GROUND_STEP_M,
      source: 'Terrain Tiles on AWS (Mapzen/Tilezen Terrarium: SRTM, GMTED2010, ETOPO1)'};
    await fs.writeFile(path.join(folder, `${id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    const bytes = (await fs.stat(target)).size;
    console.log(`ground ${id}: ${fetched} tiles at z${zoom}, ${size}x${size} over ${km} km, elevation `
      + `${Math.round(min)}..${Math.round(max)} m, ${bytes} bytes -> ${target}`);
    return;
  }

  if (command === 'track') {
    const [id, ...files] = rest;
    if (!id || !files.length) throw new Error('track needs a location id and at least one GPX file');
    const tolerance = options.toleranceKm ?? 0.05;
    const segments = [];
    for (const file of files) {
      const points = simplifyLine(gpxTrack(await fs.readFile(file, 'utf8')), tolerance)
        .map(([lon, lat]) => [round(lon), round(lat)]);
      if (points.length >= 2) segments.push(points);
    }
    const target = path.join(root, 'public', 'places', 'tracks', `${id}.json`);
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.writeFile(target, `${JSON.stringify({segments})}\n`);
    const points = segments.reduce((sum, segment) => sum + segment.length, 0);
    console.log(`track ${id}: ${segments.length} segments, ${points} points -> ${target}`);
    return;
  }

  throw new Error('usage: build-places-geo.mjs coast <geojson…> | elevation <image> | region <lon> <lat> '
    + '| ground <id> <lon> <lat> | track <id> <gpx…>');
}

// Run when invoked directly; scripts/test imports the helpers above without running it.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
