// Reads the travel photo folders and writes data/travelPhotos.json (--check only reports). A gallery is a folder,
// public/travel/photos/<trip>/<gallery>/, its images in file-name order; a photo's text is the .txt file of the same
// name beside it, if any. The gallery's title and dates live in data/travel.ts under the folder's name.
// npm.cmd run sync:travel-photos

import {readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {getDimensions} from './imageDimensions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PHOTOS_DIR = path.join(ROOT, 'public', 'travel', 'photos');
const OUTPUT_FILE = path.join(ROOT, 'data', 'travelPhotos.json');
const CHECK_ONLY = process.argv.includes('--check');
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

async function main() {
  const galleries = {};
  for (const trip of await folders(PHOTOS_DIR)) {
    for (const gallery of await folders(path.join(PHOTOS_DIR, trip))) {
      const dir = path.join(PHOTOS_DIR, trip, gallery);
      const files = (await readdir(dir))
        .filter((file) => IMAGE.test(file))
        .sort((a, b) => a.localeCompare(b, 'en', {numeric: true}));
      galleries[`${trip}/${gallery}`] = await Promise.all(files.map(async (file) => {
        const {width, height} = getDimensions(await readFile(path.join(dir, file)));
        const text = await readText(path.join(dir, `${path.parse(file).name}.txt`));
        return {src: `/travel/photos/${trip}/${gallery}/${file}`, width, height, text};
      }));
    }
  }

  const next = `${JSON.stringify(galleries, null, 2)}\n`;
  const current = await readText(OUTPUT_FILE).then((text) => (text ? `${text}\n` : ''));
  if (next === current) {
    console.log('Travel photos are already in sync.');
    return;
  }
  const count = Object.values(galleries).reduce((sum, photos) => sum + photos.length, 0);
  console.log(`Travel photos changed: ${count} photos in ${Object.keys(galleries).length} galleries.`);
  if (CHECK_ONLY) process.exitCode = 1;
  else await writeFile(OUTPUT_FILE, next);
}

await main();
