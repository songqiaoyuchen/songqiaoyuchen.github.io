// Imports travel photos from their originals in photos-src/<trip>/<gallery>/ (git-ignored: full size, with GPS) to
// public/travel/photos/<trip>/<gallery>/: a WebP for the viewer and a small one in thumbs/ for the trip panel. The
// site is a static export that serves files as they are, so each is resized here. Outputs carry no metadata (no
// GPS, camera or time), colours converted to sRGB. Each is named for when it was taken (2026-05-14_164438.webp), from
// the camera or else a date leading the original's name, so the gallery runs in time order; an original with neither
// is skipped. A new photo gets an entry in the gallery's photos.json with its day; its location and description are
// written by hand. Photos already imported are skipped (--force redoes them); originals removed later leave their
// outputs for you to delete. Then the sync runs.
// npm.cmd run import:travel-photos

import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {crc32, deflateSync} from 'node:zlib';
import decodeHeic from 'heic-decode';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_DIR = path.join(ROOT, 'photos-src');
const PHOTOS_DIR = path.join(ROOT, 'public', 'travel', 'photos');
const FORCE = process.argv.includes('--force');
const ORIGINAL = /\.(heic|heif|jpe?g|png|webp|tiff?)$/i;
const HEIC = /\.hei[cf]$/i;

// Long edge (px) and WebP quality: the viewer's photo, and the trip panel's thumbnail (120px wide, at up to 3x).
const FULL = {size: 2400, quality: 80};
const THUMB = {size: 480, quality: 72};

async function folders(dir) {
  try {
    const entries = await readdir(dir, {withFileTypes: true});
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

/** When a photo was taken, 'YYYY-MM-DD_HHMMSS', from its EXIF DateTimeOriginal (else DateTime); '' when none. */
function exifTime(buffer) {
  const header = /(?:Exif\0\0|eXIf)(MM\0\x2a|II\x2a\0)/.exec(buffer.toString('latin1'));
  if (!header) return '';
  const tiff = header.index + header[0].length - 4;
  const little = header[1].startsWith('II');
  const u16 = (at) => (little ? buffer.readUInt16LE(tiff + at) : buffer.readUInt16BE(tiff + at));
  const u32 = (at) => (little ? buffer.readUInt32LE(tiff + at) : buffer.readUInt32BE(tiff + at));
  const entry = (ifd, tag) => {
    for (let i = 0, count = u16(ifd); i < count; i++) {
      if (u16(ifd + 2 + i * 12) === tag) return ifd + 2 + i * 12;
    }
    return null;
  };
  try {
    const ifd0 = u32(4);
    const exif = entry(ifd0, 0x8769);
    const date = (exif !== null && entry(u32(exif + 8), 0x9003)) || entry(ifd0, 0x0132);
    if (!date) return '';
    const text = buffer.toString('latin1', tiff + u32(date + 8), tiff + u32(date + 8) + 19);
    const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
    return match ? `${match[1]}-${match[2]}-${match[3]}_${match[4]}${match[5]}${match[6]}` : '';
  } catch {
    return '';
  }
}

/** The same from an original whose camera left no date but whose name starts with one: '2026-05-20 1430 x.png'. */
function nameTime(file) {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ _T-]?(\d{2})[:.]?(\d{2})(?:[:.]?(\d{2}))?)?/.exec(file);
  return match ? `${match[1]}_${match[2] ?? '00'}${match[3] ?? '00'}${match[4] ?? '00'}` : '';
}

/** The ICC profile in a HEIC's colr box, if any. */
function heicProfile(buffer) {
  const at = buffer.indexOf('colrprof', 0, 'latin1');
  return at < 4 ? null : buffer.subarray(at + 8, at - 4 + buffer.readUInt32BE(at - 4));
}

/** A PNG with `icc` spliced in after IHDR, so sharp converts its colours to sRGB as it would any tagged image. */
function withProfile(png, icc) {
  const data = Buffer.concat([Buffer.from('icc\0\0', 'latin1'), deflateSync(icc)]);
  const body = Buffer.concat([Buffer.from('iCCP', 'latin1'), data]);
  const chunk = Buffer.alloc(body.length + 8);
  chunk.writeUInt32BE(data.length, 0);
  body.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(body), body.length + 4);
  return Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
}

/** The original as something sharp reads: HEIC decoded (already upright) and re-tagged with its profile. */
async function readable(file, buffer) {
  if (!HEIC.test(file)) return buffer;
  const {width, height, data} = await decodeHeic({buffer});
  const png = await sharp(data, {raw: {width, height, channels: 4}}).png({compressionLevel: 0}).toBuffer();
  const icc = heicProfile(buffer);
  return icc ? withProfile(png, icc) : png;
}

async function encode(input, {size, quality}, file) {
  // sharp keeps no metadata unless asked, and converts a tagged image to sRGB on the way out.
  await sharp(input)
    .rotate()
    .resize({width: size, height: size, fit: 'inside', withoutEnlargement: true})
    .webp({quality, effort: 5})
    .toFile(file);
}

async function readManifest(file) {
  let text;
  try {
    text = (await readFile(file, 'utf8')).replace(/^﻿/, '');
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path.relative(ROOT, file)} is not valid JSON, so it was left as it is: ${error.message}`);
  }
}

/**
 * Gives a photo its photos.json entry if it has none. The file is read just before it is written, and existing
 * entries are never touched, so what you write there (even while an import runs) is kept.
 */
async function addEntry(file, name, entry) {
  const manifest = await readManifest(file);
  if (manifest[name]) return;
  manifest[name] = entry;
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  let imported = 0;
  for (const trip of await folders(SOURCE_DIR)) {
    for (const gallery of await folders(path.join(SOURCE_DIR, trip))) {
      const source = path.join(SOURCE_DIR, trip, gallery);
      const target = path.join(PHOTOS_DIR, trip, gallery);
      await mkdir(path.join(target, 'thumbs'), {recursive: true});
      const manifestFile = path.join(target, 'photos.json');
      await readManifest(manifestFile); // stop here, before converting anything, if it does not parse
      // Each photo is named for when it was taken, so name order is the gallery's order; a shared second gets -2, -3.
      const originals = [];
      for (const file of (await readdir(source)).filter((name) => ORIGINAL.test(name))) {
        const buffer = await readFile(path.join(source, file));
        const time = exifTime(buffer) || nameTime(file);
        if (time) originals.push({file, buffer, time});
        else console.warn(`${trip}/${gallery}/${file}: no date in the photo; start its name with one, e.g. `
          + `"2026-05-20 1430 ${file}", and import again`);
      }
      originals.sort((a, b) => a.time.localeCompare(b.time) || a.file.localeCompare(b.file));
      const taken = new Map();
      for (const {file, buffer, time} of originals) {
        const count = (taken.get(time) ?? 0) + 1;
        taken.set(time, count);
        const name = `${time}${count > 1 ? `-${count}` : ''}.webp`;
        const full = path.join(target, name);
        const thumb = path.join(target, 'thumbs', name);
        if (FORCE || !existsSync(full) || !existsSync(thumb)) {
          const input = await readable(file, buffer);
          await encode(input, FULL, full);
          await encode(input, THUMB, thumb);
          imported++;
          console.log(`${trip}/${gallery}/${name} ← ${file}`);
        }
        await addEntry(manifestFile, name, {date: time.slice(0, 10), location: '', description: ''});
      }
    }
  }
  console.log(imported ? `Imported ${imported} photos.` : 'No new photos in photos-src/.');
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'assets', 'sync-travel-photos.mjs')], {stdio: 'inherit'});
  } catch {
    process.exitCode = 1;
  }
}

await main();
