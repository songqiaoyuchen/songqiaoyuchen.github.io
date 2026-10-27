// Bakes the lake dive's crack: the wall's radius at every station and ring angle (CrackRoute.radii, the costly
// part of its mesh), in STEP-unit steps encoded by lib/scene/lakeBake.ts and gzipped, + manifest. The browser lays
// the mesh out from it.
// npm run bake:lake writes it; --check (prebuild) fails when the walls no longer match the bake, recomputing a
// sample of stations so any change to the route, the walls' code or their config is caught.
import {createHash} from 'node:crypto';
import {mkdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync, gzipSync} from 'node:zlib';
import {LAKE_DIVE_CONFIG, lakePlacement} from '../../config/scene/lake.ts';
import {CrackRoute} from '../../lib/scene/lake.ts';
import {decodeCrackRadii, encodeCrackRadii} from '../../lib/scene/lakeBake.ts';

const OUTPUT_DIRECTORY = path.join(process.cwd(), 'public/lake/baked');
const MANIFEST_PATH = path.join(OUTPUT_DIRECTORY, 'manifest.json');
const SAMPLE_EVERY = 7; // stations between those --check recomputes
const STEP = 0.004; // units: 4 cm, far finer than the mesh's own spacing or the scanned rock's push

function quantise(radius) {
  return Math.min(65535, Math.max(0, Math.round(radius / STEP)));
}

async function readBake() {
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
    const raw = gunzipSync(await readFile(path.join(OUTPUT_DIRECTORY, manifest.file)));
    if (manifest.format !== 'crack-delta-v1' || manifest.step !== STEP || raw.byteLength !== manifest.byteLength) {
      return null;
    }
    const radii = new Uint16Array(manifest.stations * manifest.ring);
    decodeCrackRadii(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength), manifest.ring, radii);
    return {manifest, radii};
  } catch {
    return null;
  }
}

function isCurrent(bake, route) {
  if (!bake) return false;
  const {manifest, radii} = bake;
  const angles = route.ringAngles();
  if (manifest.stations !== route.stations.length || manifest.ring !== angles.length) return false;
  for (let i = 0; i < route.stations.length; i += SAMPLE_EVERY) {
    for (let j = 0; j < angles.length; j++) {
      const expected = quantise(route.radius(angles[j], route.stations[i].s));
      if (Math.abs(radii[i * angles.length + j] - expected) > 1) return false;
    }
  }
  return true;
}

async function main() {
  const route = new CrackRoute(LAKE_DIVE_CONFIG, lakePlacement());
  const current = isCurrent(await readBake(), route);
  if (process.argv.includes('--check')) {
    if (!current) throw new Error('Lake bake is missing or stale. Run `npm run bake:lake`.');
    console.log('Lake bake is current.');
    return;
  }
  if (current && !process.argv.includes('--force')) {
    console.log('Lake bake is already current.');
    return;
  }

  console.log('Sampling the crack walls…');
  const ring = route.ringAngles().length;
  const raw = Buffer.from(encodeCrackRadii(Uint16Array.from(route.radii(), quantise), ring));
  const file = `crack.${createHash('sha256').update(raw).digest('hex').slice(0, 16)}.bin.gz`;
  const compressed = gzipSync(raw, {level: 9});
  await mkdir(OUTPUT_DIRECTORY, {recursive: true});
  // Earlier bakes' files go; the manifest names the one in use.
  const previous = await readBake();
  if (previous && previous.manifest.file !== file) {
    await rm(path.join(OUTPUT_DIRECTORY, previous.manifest.file), {force: true});
  }
  await writeFile(path.join(OUTPUT_DIRECTORY, file), compressed);
  const manifest = {
    byteLength: raw.byteLength,
    compressedByteLength: compressed.byteLength,
    file,
    format: 'crack-delta-v1',
    ring,
    stations: route.stations.length,
    step: STEP,
  };
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  const size = (await stat(path.join(OUTPUT_DIRECTORY, file))).size;
  console.log(`Lake bake complete (${route.stations.length} stations, ${(size / 1024 / 1024).toFixed(2)} MB compressed).`);
}

await main();
