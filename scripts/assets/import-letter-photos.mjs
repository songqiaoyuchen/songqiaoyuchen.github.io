// Imports the lake letter's photos from their originals in photos-src/letter/ (git-ignored: full size, may carry GPS)
// to public/images/letter/<name>.webp, which data/lake.ts imports. A print is at most 22rem wide (80vw on phones), so
// 1600px on the long edge covers it at 3x. Photos already imported are skipped (--force redoes them).
// npm.cmd run import:letter-photos

import {existsSync} from 'node:fs';
import {mkdir, readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {encode, ORIGINAL, readable} from './photoEncode.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_DIR = path.join(ROOT, 'photos-src', 'letter');
const TARGET_DIR = path.join(ROOT, 'public', 'images', 'letter');
const FORCE = process.argv.includes('--force');
const PRINT = {size: 1600, quality: 80};

async function main() {
  let files;
  try {
    files = (await readdir(SOURCE_DIR)).filter((name) => ORIGINAL.test(name));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    files = [];
  }
  await mkdir(TARGET_DIR, {recursive: true});
  let imported = 0;
  for (const file of files) {
    const name = `${path.parse(file).name}.webp`;
    const target = path.join(TARGET_DIR, name);
    if (!FORCE && existsSync(target)) continue;
    await encode(await readable(file, await readFile(path.join(SOURCE_DIR, file))), PRINT, target);
    imported++;
    console.log(`letter/${name} ← ${file}`);
  }
  console.log(imported ? `Imported ${imported} letter photos.` : 'No new photos in photos-src/letter/.');
}

await main();
