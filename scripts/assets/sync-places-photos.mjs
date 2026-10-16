// Reads the places photo folders and writes data/placesPhotos.json (--check only reports). A gallery is a folder,
// public/places/photos/<location>/<gallery>/, written by import-places-photos.mjs: WebP photos, their thumbnails in
// thumbs/, and a photos.json giving each photo's date (YYYY-MM-DD), location and optional description:
// {"2026-05-14_164438.webp": {"date", "location", "description"?, "order"?}}. Photos are ordered by date, then by
// name (the time taken), so a corrected date moves a photo to its day. "order" (a number, lowest first) moves a photo
// ahead of the rest in the location panel's strip only; the gallery itself stays in date order. A photo missing its date or location is left out with
// a warning, so galleries can be filled in gradually; --strict (the build) fails instead. The gallery's title lives in data/places.ts under the folder's name.
// npm.cmd run sync:places-photos

import {existsSync} from 'node:fs';
import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {getDimensions} from './imageDimensions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHOTOS_DIR = path.join(ROOT, 'public', 'places', 'photos');
const OUTPUT_FILE = path.join(ROOT, 'data', 'placesPhotos.json');
const CHECK_ONLY = process.argv.includes('--check');
const STRICT = process.argv.includes('--strict');
const IMAGE = /\.(jpe?g|png|webp|gif)$/i;

async function folders(dir) {
  try {
    const entries = await readdir(dir, {withFileTypes: true});
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readText(file) {
  try {
    return (await readFile(file, 'utf8')).trim();
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What a photo's photos.json entry lacks, if anything. */
function missing(entry) {
  if (!entry) return ['no entry in photos.json'];
  const {date, location, description = '', order} = entry;
  const gaps = [];
  if (typeof date !== 'string' || !DATE.test(date) || Number.isNaN(Date.parse(date))) gaps.push('date (YYYY-MM-DD)');
  if (typeof location !== 'string' || !location.trim()) gaps.push('location');
  if (typeof description !== 'string') gaps.push('description as text');
  if (order !== undefined && !Number.isFinite(order)) gaps.push('order as a number');
  return gaps;
}

async function main() {
  const galleries = {};
  const problems = [];
  for (const location of await folders(PHOTOS_DIR)) {
    for (const gallery of await folders(path.join(PHOTOS_DIR, location))) {
      const dir = path.join(PHOTOS_DIR, location, gallery);
      const files = (await readdir(dir))
        .filter((file) => IMAGE.test(file))
        .sort((a, b) => a.localeCompare(b, 'en', {numeric: true}));
      const key = `${location}/${gallery}`;
      const manifest = await readText(path.join(dir, 'photos.json'));
      const details = manifest ? JSON.parse(manifest) : {};
      for (const name of Object.keys(details)) {
        if (!files.includes(name)) problems.push(`${key}/${name}: in photos.json but no such image`);
      }
      const photos = [];
      for (const file of files) {
        const gaps = missing(details[file]);
        if (!existsSync(path.join(dir, 'thumbs', file))) gaps.push('thumbnail (run import:places-photos)');
        if (gaps.length) {
          problems.push(`${key}/${file}: needs ${gaps.join(', ')}`);
          continue;
        }
        const {date, location, description = '', order} = details[file];
        const {width, height} = getDimensions(await readFile(path.join(dir, file)));
        const src = `/places/photos/${key}/${file}`;
        const thumb = `/places/photos/${key}/thumbs/${file}`;
        photos.push({
          src, thumb, width, height, date, location: location.trim(), description: description.trim(),
          ...(order === undefined ? {} : {order}),
        });
      }
      // Files are already in name order, and the sort is stable, so a day's photos keep it.
      galleries[key] = photos.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
  }

  if (problems.length) {
    const action = STRICT ? 'Places photos are missing details' : 'Places photos left out until they have details';
    console.warn(`${action}:\n  ${problems.join('\n  ')}`);
    if (STRICT) {
      process.exitCode = 1;
      return;
    }
  }

  const next = `${JSON.stringify(galleries, null, 2)}\n`;
  const current = await readText(OUTPUT_FILE).then((text) => (text ? `${text}\n` : ''));
  if (next === current) {
    console.log('Places photos are already in sync.');
    return;
  }
  const count = Object.values(galleries).reduce((sum, photos) => sum + photos.length, 0);
  console.log(`Places photos changed: ${count} photos in ${Object.keys(galleries).length} galleries.`);
  if (CHECK_ONLY) process.exitCode = 1;
  else await writeFile(OUTPUT_FILE, next);
}

await main();
