// Measure, and with --apply correct, the translation between a generated Art
// illustration and the clean terrain capture it was painted from. Image models
// tend to drift the composition; the overlay must register to the Art camera.
// Usage: node scripts/assets/register-illustration.mjs <oil|pencil> [--apply]
import {copyFile} from 'node:fs/promises';
import sharp from 'sharp';

// Windows cannot overwrite an input that sharp's cache keeps open.
sharp.cache(false);
const SOURCE = 'tmp/pencil-overlay/terrain-source.png';
const [medium, flag] = process.argv.slice(2);
if (!['oil', 'pencil'].includes(medium)) throw new Error('Usage: register-illustration.mjs <oil|pencil> [--apply]');
const image = `public/textures/terrain/${medium}-illustration.webp`;
const {width, height} = await sharp(image).metadata();

// Gradient magnitude ignores the styles' different tones and exposure.
async function gradient(file, w, h) {
  const {data} = await sharp(file).resize(w, h, {fit: 'fill'}).greyscale().normalise().raw()
    .toBuffer({resolveWithObject: true});
  const g = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    g[i] = Math.hypot(data[i + 1] - data[i - 1], data[i + w] - data[i - w]);
  }
  return g;
}

// Correlation of the illustration against the source displaced by (dx, dy).
function correlation(source, painted, w, h, dx, dy) {
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
  for (let y = Math.max(1, 1 - dy); y < Math.min(h - 1, h - 1 - dy); y++) {
    for (let x = Math.max(1, 1 - dx); x < Math.min(w - 1, w - 1 - dx); x++) {
      const a = source[(y + dy) * w + x + dx], b = painted[y * w + x];
      sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b; n++;
    }
  }
  return (sab / n - sa * sb / n / n) / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2));
}

async function search(w, h, center, radius) {
  const [source, painted] = await Promise.all([gradient(SOURCE, w, h), gradient(image, w, h)]);
  let best = {r: -Infinity};
  for (let dy = center[1] - radius; dy <= center[1] + radius; dy++) {
    for (let dx = center[0] - radius; dx <= center[0] + radius; dx++) {
      const r = correlation(source, painted, w, h, dx, dy);
      if (r > best.r) best = {r, dx, dy};
    }
  }
  return best;
}

// Coarse search, then refine at full illustration resolution.
const coarseScale = 400 / width;
const coarse = await search(400, Math.round(height * coarseScale), [0, 0], 24);
const fine = await search(width, height,
  [Math.round(coarse.dx / coarseScale), Math.round(coarse.dy / coarseScale)], Math.ceil(1 / coarseScale));
const identity = correlation(...await Promise.all([gradient(SOURCE, width, height), gradient(image, width, height)]),
  width, height, 0, 0);
// Positive dy: the painted terrain sits that many pixels above the source.
console.log(JSON.stringify({medium, offsetPx: [fine.dx, fine.dy], correlation: {identity, registered: fine.r}}));

if (flag === '--apply' && (fine.dx || fine.dy)) {
  const backup = `tmp/pencil-overlay/${medium}-before-registration.webp`;
  await copyFile(image, backup);
  // Mirror the vacated edge (open sky at the top) so canvas/paper grain continues.
  const extend = {
    top: Math.max(0, fine.dy), bottom: Math.max(0, -fine.dy),
    left: Math.max(0, fine.dx), right: Math.max(0, -fine.dx), extendWith: 'mirror',
  };
  const shifted = await sharp(backup).extend(extend).raw().toBuffer({resolveWithObject: true});
  await sharp(shifted.data, {raw: shifted.info})
    .extract({left: Math.max(0, -fine.dx), top: Math.max(0, -fine.dy), width, height})
    .webp({quality: 92}).toFile(image);
  console.log(`Shifted ${image}; original kept at ${backup}. Bump the image version in config/art/backdrop.ts.`);
}
