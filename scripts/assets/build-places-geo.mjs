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
//     and in blue the ground's kind (lib/scene/places.ts GROUND_KIND): ESA WorldCover 10 m classes (CC BY 4.0, read
//     from the cloud-optimised GeoTIFFs on AWS at the overview nearest the grid's spacing; a tile missing from the
//     set is open sea) with Natural Earth 1:10m lakes, rivers and glaciers as flags (GeoJSON fetched once into
//     .cache/places-geo/), written as lossless WebP to public/places/ground/<location id>.webp with a .json describing
//     it. Centre it on the middle of the box about the location's places, the centre of its zoom.
//
//   node scripts/assets/build-places-geo.mjs track <location id> <a.gpx> [<b.gpx> ...] [--tolerance-km 0.05]
//     Each GPX recording becomes one segment of the location, simplified; written to public/places/tracks/<id>.json
//     as {"segments": [[[lon, lat], ...], ...]} ready to paste into data/places.ts.
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {GROUND_FLAG, GROUND_KIND, encodeLines, packGroundKind} from '../../lib/scene/places.ts';

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

const WORLDCOVER_URL = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map';
const NATURAL_EARTH_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const USER_AGENT = 'sqyc build-places-geo (personal site bake)';

/** The box about a grid's places, longitudes about `lon` so a box across the antimeridian stays one box. */
export function gridBox(places, lon) {
  let west = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  let south = Infinity;
  for (let index = 0; index < places.length; index += 2) {
    const relative = ((places[index] - lon + 540) % 360) - 180;
    west = Math.min(west, lon + relative);
    east = Math.max(east, lon + relative);
    north = Math.max(north, places[index + 1]);
    south = Math.min(south, places[index + 1]);
  }
  return {west, east, north, south};
}

/**
 * ESA WorldCover classes (over ten: GROUND_KIND) for the grid's places: each 3 x 3 degree tile with places on it
 * read at the overview whose pixels are at or just under `metresPerPixel`, over HTTP ranges; a tile the set lacks is
 * open sea, so its places are water. Places the tiles mark as no data stay 0.
 */
async function worldCoverKinds(places, metresPerPixel) {
  const {fromUrl} = await import('geotiff');
  const kinds = new Uint8Array(places.length / 2);
  // Each place's tile, so a tile touches only its own cells and the tiles can be read side by side.
  const tiles = new Map();
  const wrap = (lon) => ((lon + 540) % 360) - 180;
  for (let cell = 0; cell < kinds.length; cell++) {
    const tileLon = Math.floor(wrap(places[cell * 2]) / 3) * 3;
    const tileLat = Math.floor(places[cell * 2 + 1] / 3) * 3;
    const key = `${tileLat}/${tileLon}`;
    let tile = tiles.get(key);
    if (!tile) {
      tile = {tileLon, tileLat, cells: []};
      tiles.set(key, tile);
    }
    tile.cells.push(cell);
  }
  let read = 0;
  let missing = 0;
  const readTile = async ({tileLon, tileLat, cells}) => {
    const name = `${tileLat < 0 ? 'S' : 'N'}${String(Math.abs(tileLat)).padStart(2, '0')}`
      + `${tileLon < 0 ? 'W' : 'E'}${String(Math.abs(tileLon)).padStart(3, '0')}`;
    const url = `${WORLDCOVER_URL}/ESA_WorldCover_10m_2021_v200_${name}_Map.tif`;
    const head = await fetch(url, {method: 'HEAD', headers: {'User-Agent': USER_AGENT}});
    if (head.status === 404) {
      missing++;
      for (const cell of cells) kinds[cell] = GROUND_KIND.water;
      return;
    }
    if (!head.ok) throw new Error(`${url}: ${head.status}`);
    const tiff = await fromUrl(url, {allowFullFile: false});
    const count = await tiff.getImageCount();
    const metresPerDegree = 111320 * Math.cos((tileLat + 1.5) * DEG);
    let chosen = 0;
    for (let index = 0; index < count; index++) {
      const image = await tiff.getImage(index);
      if (3 / image.getWidth() * metresPerDegree <= metresPerPixel) chosen = index;
    }
    const image = await tiff.getImage(chosen);
    const width = image.getWidth();
    const height = image.getHeight();
    const [raster] = await image.readRasters();
    read++;
    for (const cell of cells) {
      const x = Math.min(width - 1, Math.floor((wrap(places[cell * 2]) - tileLon) / 3 * width));
      const y = Math.min(height - 1, Math.floor((tileLat + 3 - places[cell * 2 + 1]) / 3 * height));
      kinds[cell] = raster[y * width + x] / 10;
    }
  };
  const queue = [...tiles.values()];
  await Promise.all(Array.from({length: 8}, async () => {
    while (queue.length) await readTile(queue.shift());
  }));
  return {kinds, read, missing};
}

async function naturalEarthGeoJson(name, cacheDir) {
  const file = path.join(cacheDir, name);
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    const response = await fetch(NATURAL_EARTH_URL + name, {headers: {'User-Agent': USER_AGENT}});
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    const text = await response.text();
    await fs.mkdir(cacheDir, {recursive: true});
    await fs.writeFile(file, text);
    return JSON.parse(text);
  }
}

/**
 * Natural Earth lakes, rivers and glaciers as GROUND_FLAG bits for the grid's places, plus which places its land
 * polygons leave at sea (the `sea` byte array): each layer drawn onto a lon/lat raster over the box at half the
 * grid's spacing (polygons filled scanline by scanline, even-odd; rivers as one-cell lines), then read at each place.
 */
export async function naturalEarthFlags(places, box, metresPerPixel, cacheDir) {
  const cell = metresPerPixel / 111320 / 2;
  const columns = Math.ceil((box.east - box.west) / cell);
  const rows = Math.ceil((box.north - box.south) / cell);
  const CHANNELS = 4; // lake, river, glacier, land
  const raster = new Uint8Array(columns * rows * CHANNELS);
  const centre = (box.west + box.east) / 2;
  const rowOf = (lat) => (box.north - lat) / cell;
  // A line's columns, its first point placed within half a turn of the box's centre and the rest unwrapped from it,
  // so a line stays in one piece however far it runs: a shore wrapped round to the box's west would flip the
  // scanline parity of every row it crosses.
  const columnsOf = (line) => {
    const columnsOut = new Float64Array(line.length);
    let previous = NaN;
    for (let index = 0; index < line.length; index++) {
      let lon = line[index][0];
      if (Number.isNaN(previous)) lon = centre + ((((lon - centre) % 360) + 540) % 360) - 180;
      else lon += Math.round((previous - lon) / 360) * 360;
      previous = lon;
      columnsOut[index] = (lon - box.west) / cell;
    }
    return columnsOut;
  };
  const fillRings = (rings, channel) => {
    const edges = [];
    for (const ring of rings) {
      const ringColumns = columnsOf(ring);
      for (let index = 0; index + 1 < ring.length; index++) {
        const y0 = ring[index][1];
        const y1 = ring[index + 1][1];
        if (y0 !== y1) edges.push([ringColumns[index], rowOf(y0), ringColumns[index + 1], rowOf(y1)]);
      }
    }
    let first = Infinity;
    let last = -Infinity;
    for (const edge of edges) {
      first = Math.min(first, edge[1], edge[3]);
      last = Math.max(last, edge[1], edge[3]);
    }
    for (let row = Math.max(0, Math.floor(first)); row <= Math.min(rows - 1, Math.ceil(last)); row++) {
      const y = row + 0.5;
      const crossings = [];
      for (const [ax, ay, bx, by] of edges) {
        if ((y >= ay && y < by) || (y >= by && y < ay)) crossings.push(ax + (y - ay) / (by - ay) * (bx - ax));
      }
      crossings.sort((a, b) => a - b);
      for (let index = 0; index + 1 < crossings.length; index += 2) {
        const from = Math.max(0, Math.round(crossings[index]));
        const to = Math.min(columns, Math.round(crossings[index + 1]));
        for (let column = from; column < to; column++) raster[(row * columns + column) * CHANNELS + channel] = 1;
      }
    }
  };
  const drawLine = (line, channel) => {
    const lineColumns = columnsOf(line);
    for (let index = 0; index + 1 < line.length; index++) {
      const x0 = lineColumns[index];
      const y0 = rowOf(line[index][1]);
      const x1 = lineColumns[index + 1];
      const y1 = rowOf(line[index + 1][1]);
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let step = 0; step <= steps; step++) {
        const column = Math.round(x0 + (x1 - x0) * step / steps);
        const row = Math.round(y0 + (y1 - y0) * step / steps);
        if (column >= 0 && column < columns && row >= 0 && row < rows) {
          raster[(row * columns + column) * CHANNELS + channel] = 1;
        }
      }
    }
  };
  const polygonsOf = (geometry) => geometry.type === 'Polygon' ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const linesOf = (geometry) => geometry.type === 'LineString' ? [geometry.coordinates]
    : geometry.type === 'MultiLineString' ? geometry.coordinates : [];
  const layers = [['ne_10m_lakes.geojson', 0], ['ne_10m_glaciated_areas.geojson', 2], ['ne_10m_land.geojson', 3]];
  for (const [name, channel] of layers) {
    const data = await naturalEarthGeoJson(name, cacheDir);
    for (const feature of data.features) {
      if (feature.geometry) for (const polygon of polygonsOf(feature.geometry)) fillRings(polygon, channel);
    }
  }
  const rivers = await naturalEarthGeoJson('ne_10m_rivers_lake_centerlines.geojson', cacheDir);
  for (const feature of rivers.features) {
    if (feature.geometry) for (const line of linesOf(feature.geometry)) drawLine(line, 1);
  }
  const flags = new Uint8Array(places.length / 2);
  const sea = new Uint8Array(places.length / 2);
  for (let cell = 0; cell < flags.length; cell++) {
    const column = Math.min(columns - 1, Math.max(0, Math.floor(columnsOf([[places[cell * 2], 0]])[0])));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(rowOf(places[cell * 2 + 1]))));
    const at = (row * columns + column) * CHANNELS;
    flags[cell] = (raster[at] ? GROUND_FLAG.lake : 0) | (raster[at + 1] ? GROUND_FLAG.river : 0)
      | (raster[at + 2] ? GROUND_FLAG.glacier : 0);
    sea[cell] = raster[at + 3] ? 0 : 1;
  }
  return {flags, sea};
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
    const {west, east, north, south} = gridBox(places, lon);
    const metresPerPixel = km * 1000 / size;
    // The finest tiles the grid can use: its pixel at the box's widest latitude.
    const zoom = zoomForResolution(metresPerPixel, Math.min(Math.abs(north), Math.abs(south)));
    const {sampler, fetched} = await terrariumSampler(sharp, west, east, Math.min(north, 85), Math.max(south, -85),
      zoom);
    const box = {west, east, north: Math.min(north, 90), south: Math.max(south, -90)};
    const cover = await worldCoverKinds(places, metresPerPixel);
    const earth = await naturalEarthFlags(places, box, metresPerPixel, path.join(root, '.cache', 'places-geo'));
    const pixels = Buffer.alloc(size * size * 3);
    let min = Infinity;
    let max = -Infinity;
    const counts = new Map();
    for (let cell = 0; cell < size * size; cell++) {
      const metres = sampler(places[cell * 2], places[cell * 2 + 1]);
      min = Math.min(min, metres);
      max = Math.max(max, metres);
      const level = Math.min(65535, Math.round(Math.max(0, metres) / GROUND_STEP_M));
      pixels[cell * 3] = level >> 8;
      pixels[cell * 3 + 1] = level & 255;
      // WorldCover's class; where it has none, Natural Earth's sea is water.
      const kind = cover.kinds[cell] || (earth.sea[cell] ? GROUND_KIND.water : 0);
      pixels[cell * 3 + 2] = packGroundKind(kind, earth.flags[cell]);
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    const folder = path.join(root, 'public', 'places', 'ground');
    await fs.mkdir(folder, {recursive: true});
    const target = path.join(folder, `${id}.webp`);
    await sharp(pixels, {raw: {width: size, height: size, channels: 3}}).webp({lossless: true, effort: 6})
      .toFile(target);
    const meta = {lon, lat, km, size, zoom, stepMetres: GROUND_STEP_M, kinds: true,
      source: 'Terrain Tiles on AWS (Mapzen/Tilezen Terrarium: SRTM, GMTED2010, ETOPO1)',
      kindsSource: 'ESA WorldCover 10 m 2021 v200 (CC BY 4.0); Natural Earth 1:10m lakes, rivers, glaciated areas, land'};
    await fs.writeFile(path.join(folder, `${id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    const bytes = (await fs.stat(target)).size;
    const share = (kind) => `${Math.round((counts.get(kind) ?? 0) / (size * size) * 100)}%`;
    console.log(`ground ${id}: ${fetched} tiles at z${zoom}, ${size}x${size} over ${km} km, elevation `
      + `${Math.round(min)}..${Math.round(max)} m; kinds from ${cover.read} WorldCover tiles (${cover.missing} at `
      + `sea): water ${share(GROUND_KIND.water)}, snow ${share(GROUND_KIND.snow)}, trees ${share(GROUND_KIND.trees)}, `
      + `unknown ${share(0)}; ${bytes} bytes -> ${target}`);
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
