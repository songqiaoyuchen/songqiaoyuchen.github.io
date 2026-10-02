// Terrain-space adaptation of the layered flow strokes / separate paint relief
// described by Wet Paint Flow: https://github.com/simonxxooxxoo/wet-paint-flow
// Independent raster implementation; no upstream code or image assets are copied.
import sharp from 'sharp';
import {readFile, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {OIL_TERRAIN_CONFIG} from '../config/scene/oil.ts';
import {TERRAIN_MATERIAL_CONFIG} from '../config/scene/terrain.ts';

const {crop, textureWidth: width} = OIL_TERRAIN_CONFIG;
const height = Math.round(width * crop.height / crop.width);
const source = sharp('public/textures/terrain/diffuse_map.png')
  .extract({left: crop.x, top: crop.y, width: crop.width, height: crop.height})
  .resize(width, height).removeAlpha().toColourspace('srgb');
// Simplify geographic micro-detail before selecting paint colors.
const colorPixels = await source.clone().blur(10).raw().toBuffer();
const fieldWidth = 512;
const fieldHeight = Math.round(fieldWidth * height / width);
const pixels = await source.clone().resize(fieldWidth, fieldHeight).blur(1.3).raw().toBuffer();
const field = new Float32Array(fieldWidth * fieldHeight * 3);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const manifest = JSON.parse(await readFile('public/textures/terrain/baked/manifest.json', 'utf8'));
const shell = manifest.artifacts.shell;
const heightBytes = gunzipSync(await readFile(`public/textures/terrain/baked/${shell.file}`));
const heights = new Float32Array(heightBytes.buffer, heightBytes.byteOffset, heightBytes.byteLength / 4);
function heightAt(x, y) {
  const ix = Math.round(clamp(x / width, 0, 1) * (shell.width - 1));
  const iy = Math.round(clamp(1 - y / height, 0, 1) * (shell.height - 1));
  return Math.pow(heights[iy * shell.width + ix], TERRAIN_MATERIAL_CONFIG.contrast)
    * TERRAIN_MATERIAL_CONFIG.elevation;
}
function slopeAt(x, y) {
  const gx = (heightAt(x + 14, y) - heightAt(x - 14, y)) / (28 / width * 22);
  const gy = (heightAt(x, y + 14) - heightAt(x, y - 14)) / (28 / height * 22);
  const norm = Math.hypot(gx, gy, 1);
  return {gx, gy, light: clamp((gx * 0.6 + 0.7 + gy * 0.4) / norm, -1, 1)};
}
function sampleColor(x, y) {
  const px = clamp(x, 0, width - 1), py = clamp(y, 0, height - 1);
  const x0 = Math.floor(px), y0 = Math.floor(py);
  const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
  const tx = px - x0, ty = py - y0;
  return [0, 1, 2].map((c) => {
    const top = colorPixels[(y0 * width + x0) * 3 + c] * (1 - tx)
      + colorPixels[(y0 * width + x1) * 3 + c] * tx;
    const bottom = colorPixels[(y1 * width + x0) * 3 + c] * (1 - tx)
      + colorPixels[(y1 * width + x1) * 3 + c] * tx;
    return top * (1 - ty) + bottom * ty;
  });
}
function detailAt(x, y) {
  const samples = [sampleColor(x - 4, y), sampleColor(x + 4, y),
    sampleColor(x, y - 4), sampleColor(x, y + 4)];
  // Color range also catches blue waterways that have weak luminance edges.
  return clamp(Math.max(...[0, 1, 2].map((c) =>
    Math.max(...samples.map((s) => s[c])) - Math.min(...samples.map((s) => s[c])))) / 40, 0, 1);
}
const luminance = (x, y) => {
  const i = (clamp(y, 0, fieldHeight - 1) * fieldWidth + clamp(x, 0, fieldWidth - 1)) * 3;
  return (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;
};

// A smoothed structure tensor gives an unoriented line field along color edges.
for (let y = 0; y < fieldHeight; y++) {
  for (let x = 0; x < fieldWidth; x++) {
    const gx = luminance(x + 1, y) - luminance(x - 1, y);
    const gy = luminance(x, y + 1) - luminance(x, y - 1);
    const i = (y * fieldWidth + x) * 3;
    field[i] = gx * gx;
    field[i + 1] = gy * gy;
    field[i + 2] = gx * gy;
  }
}
const angles = new Float32Array(fieldWidth * fieldHeight);
for (let y = 0; y < fieldHeight; y++) {
  for (let x = 0; x < fieldWidth; x++) {
    let xx = 0, yy = 0, xy = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const i = (clamp(y + dy, 0, fieldHeight - 1) * fieldWidth + clamp(x + dx, 0, fieldWidth - 1)) * 3;
        const weight = Math.exp(-(dx * dx + dy * dy) / 4);
        xx += field[i] * weight;
        yy += field[i + 1] * weight;
        xy += field[i + 2] * weight;
      }
    }
    const slope = slopeAt(x / fieldWidth * width, y / fieldHeight * height);
    angles[y * fieldWidth + x] = Math.hypot(slope.gx, slope.gy) > 0.15
      ? Math.atan2(slope.gy, slope.gx)
      : 0.5 * Math.atan2(2 * xy, xx - yy) + Math.PI / 2;
  }
}

let seed = 71429;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function fieldIndex(x, y) {
  return clamp(Math.round(y / height * (fieldHeight - 1)), 0, fieldHeight - 1) * fieldWidth
    + clamp(Math.round(x / width * (fieldWidth - 1)), 0, fieldWidth - 1);
}
function trace(x, y, length, sign) {
  const points = [];
  let angle = angles[fieldIndex(x, y)];
  let vx = Math.cos(angle) * sign, vy = Math.sin(angle) * sign;
  for (let step = 0; step < 4; step++) {
    angle = angles[fieldIndex(x, y)];
    let nx = Math.cos(angle), ny = Math.sin(angle);
    if (vx * nx + vy * ny < 0) {nx = -nx; ny = -ny;}
    vx = vx * 0.65 + nx * 0.35;
    vy = vy * 0.65 + ny * 0.35;
    const norm = Math.hypot(vx, vy);
    x += vx / norm * length / 8;
    y += vy / norm * length / 8;
    points.push([x, y]);
  }
  return points;
}
const fmt = (v) => v.toFixed(1);
const pathFor = (points) => `M${points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join('L')}`;
const color = [];
const relief = [];
let strokeCount = 0;
const layerCounts = [];
// One cool-to-warm pigment range follows the terrain's planes. Color variation
// stays within that range instead of introducing arbitrary geographic patches.
const palettes = [
  [[20, 25, 35], [35, 49, 65], [55, 80, 99], [84, 117, 132], [137, 164, 168], [205, 216, 202]],
  [[29, 25, 24], [63, 45, 32], [112, 76, 43], [170, 120, 59], [215, 173, 98], [239, 214, 163]],
];
for (const layer of [
  {name: 'underpainting', spacing: 42, radius: 34, length: 108, minimum: 1},
  {name: 'planes', spacing: 22, radius: 11, length: 54, minimum: 0.85},
  {name: 'broken edges', spacing: 10, radius: 3.2, length: 26, minimum: 0.08},
  {name: 'accents', spacing: 8, radius: 1.8, length: 18, minimum: 0},
]) {
  const startCount = strokeCount;
  const centers = [];
  for (let y = -layer.spacing; y < height + layer.spacing; y += layer.spacing) {
    for (let x = -layer.spacing; x < width + layer.spacing; x += layer.spacing) {
      centers.push([x + (random() - 0.5) * layer.spacing,
        y + (random() - 0.5) * layer.spacing]);
    }
  }
  // Shuffled paint order prevents scalloped rows from the raster traversal.
  for (let i = centers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [centers[i], centers[j]] = [centers[j], centers[i]];
  }
  for (const [cx, cy] of centers) {
      const slope = slopeAt(cx, cy);
      const lightChange = Math.abs(slopeAt(cx + 14, cy).light - slopeAt(cx - 14, cy).light)
        + Math.abs(slopeAt(cx, cy + 14).light - slopeAt(cx, cy - 14).light);
      const detail = clamp(lightChange * 1.4 + detailAt(cx, cy) * 0.3, 0, 1);
      if (random() > layer.minimum + (1 - layer.minimum) * detail * detail) continue;
      const length = layer.length * (0.65 + random() * 0.7) * (1 - detail * 0.3);
      const radius = layer.radius * (0.65 + random() * 0.6) * (1 - detail * 0.35);
      const points = [...trace(cx, cy, length, -1).reverse(), [cx, cy], ...trace(cx, cy, length, 1)];
      const normals = points.map((point, i) => {
        const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
        const magnitude = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        return [-(b[1] - a[1]) / magnitude, (b[0] - a[0]) / magnitude];
      });
      const edge = (side) => points.map(([px, py], i) => {
        const pressure = 0.35 + 0.65 * Math.sin(i / (points.length - 1) * Math.PI) ** 0.45;
        return [px + normals[i][0] * radius * pressure * side,
          py + normals[i][1] * radius * pressure * side];
      });
      const outline = `${pathFor([...edge(1), ...edge(-1).reverse()])}Z`;
      const pigment = sampleColor(cx, cy);
      const gray = pigment[0] * 0.2126 + pigment[1] * 0.7152 + pigment[2] * 0.0722;
      const value = clamp((slope.light - 0.1) / 0.85 * 5 + (gray / 255 - 0.5) * 0.65, 0, 5);
      const paintValue = clamp(value + (random() - 0.5) * 0.25, 0, 5);
      const index = Math.floor(paintValue);
      const nextIndex = Math.min(index + 1, 5);
      const water = clamp((pigment[2] - pigment[0]) / 40, 0, 1);
      const warmth = clamp((slope.light - 0.2) / 0.65, 0, 1) * (1 - water * 0.7);
      // Keep the random draw count fixed so existing stroke geometry is preserved.
      const variation = (random() - 0.5) * 0.035;
      const tone = 0.96 + random() * 0.08;
      const blend = clamp(warmth + variation, 0, 1);
      const rgb = [0, 1, 2].map((channel) => {
        const sample = (palette) => palette[index][channel]
          + (palette[nextIndex][channel] - palette[index][channel]) * (paintValue - index);
        return Math.round(clamp((sample(palettes[0]) * (1 - blend)
          + sample(palettes[1]) * blend) * tone, 0, 255));
      });
      color.push(`<path d="${outline}" fill="rgb(${rgb.join(',')})" fill-opacity=".92"/>`);
      const load = Math.round(90 + random() * 80);
      relief.push(`<path d="${outline}" fill="rgb(${load},${load},${load})"/>`);
      // Uneven, discontinuous bristle tracks share each stroke's curved direction.
      for (const side of radius > 2 ? [-0.65, -0.3, 0.05, 0.4, 0.65] : []) {
        const bristles = points.slice(1, -1).map(([px, py], i) => {
          const offset = radius * (side + Math.sin(i * 1.8 + cx) * 0.07);
          return [px + normals[i + 1][0] * offset, py + normals[i + 1][1] * offset];
        });
        const path = pathFor(bristles);
        const bristleColor = rgb.map((c, channel) => Math.round(clamp(c
          + (side < 0 ? [28, 22, 13][channel] : -25), 0, 255)));
        color.push(`<path d="${path}" fill="none" stroke="rgb(${bristleColor.join(',')})" stroke-opacity=".3" stroke-width="${fmt(Math.max(0.6, radius * 0.09))}"/>`);
        relief.push(`<path d="${path}" fill="none" stroke="${side < 0 ? '#d5d5d5' : '#555'}" stroke-opacity=".6" stroke-width="${fmt(Math.max(0.7, radius * 0.08))}"/>`);
      }
      strokeCount++;
  }
  layerCounts.push({name: layer.name, count: strokeCount - startCount});
}
const svg = (paths, background) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${background}"/><g stroke-linecap="round" stroke-linejoin="round">${paths.join('')}</g></svg>`);
const output = 'public/textures/terrain/';
await sharp(svg(color, '#25283d')).webp({quality: 95}).toFile(`${output}oil-color.webp`);
await sharp(svg(relief, '#555')).blur(0.4).webp({lossless: true}).toFile(`${output}oil-relief.webp`);
await writeFile(`${output}oil-bake.json`, `${JSON.stringify({
  source: 'diffuse_map.png', terrainSource: shell.file, crop, width, height, strokeCount, layerCounts,
  method: 'Continuous slate-blue to ochre pigments selected by slope lighting and source waterways; preserved layered strokes and raised bristle relief.',
}, null, 2)}\n`);
console.log(`Baked ${strokeCount} terrain-space oil strokes at ${width} × ${height}.`);
