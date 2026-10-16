// Imports places photos from their originals in photos-src/<location>/<gallery>/ (git-ignored: full size, with GPS) to
// public/places/photos/<location>/<gallery>/: a WebP for the viewer and a small one in thumbs/ for the location panel. The
// site is a static export that serves files as they are, so each is resized here. Outputs carry no metadata (no
// GPS, camera or time), colours converted to sRGB. Each is named for when it was taken (2026-05-14_164438.webp), from
// the camera or else a date leading the original's name, so the gallery runs in time order; an original with neither
// is skipped. A new photo gets an entry in the gallery's photos.json with its day; an empty location is filled from
// the original's GPS by reverse geocoding with OpenStreetMap's Nominatim (cached in photos-src/geocode-cache.json),
// and is yours to correct; locations already written are never replaced. Descriptions are written by hand. Each
// photos.json is then put in the folder's order (by file name, so by time taken). Photos
// already imported are skipped (--force redoes them); originals removed later leave their
// outputs for you to delete. Then the sync runs.
// npm.cmd run import:places-photos

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
const PHOTOS_DIR = path.join(ROOT, 'public', 'places', 'photos');
const FORCE = process.argv.includes('--force');
const ORIGINAL = /\.(heic|heif|jpe?g|png|webp|tiff?)$/i;
const HEIC = /\.hei[cf]$/i;

// Long edge (px) and WebP quality: the viewer's photo, and the location panel's thumbnail (120px wide, at up to 3x).
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

/**
 * From a photo's EXIF: when it was taken, 'YYYY-MM-DD_HHMMSS' from DateTimeOriginal (else DateTime), '' when none;
 * and where, [lon, lat] in degrees from the GPS IFD, null when none.
 */
function exif(buffer) {
  const none = {time: '', lonLat: null};
  const header = /(?:Exif\0\0|eXIf)(MM\0\x2a|II\x2a\0)/.exec(buffer.toString('latin1'));
  if (!header) return none;
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
  const read = (fn) => {
    try {
      return fn();
    } catch {
      return null;
    }
  };
  const ifd0 = read(() => u32(4));
  if (ifd0 === null) return none;
  const time = read(() => {
    const exifIfd = entry(ifd0, 0x8769);
    const date = (exifIfd !== null && entry(u32(exifIfd + 8), 0x9003)) || entry(ifd0, 0x0132);
    if (!date) return '';
    const text = buffer.toString('latin1', tiff + u32(date + 8), tiff + u32(date + 8) + 19);
    const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
    return match ? `${match[1]}-${match[2]}-${match[3]}_${match[4]}${match[5]}${match[6]}` : '';
  });
  const lonLat = read(() => {
    const gpsEntry = entry(ifd0, 0x8825);
    if (gpsEntry === null) return null;
    const gps = u32(gpsEntry + 8);
    // Each coordinate is a reference letter (N/S, E/W, inline) and three rationals: degrees, minutes, seconds.
    const coordinate = (refTag, valueTag) => {
      const ref = entry(gps, refTag);
      const value = entry(gps, valueTag);
      if (ref === null || value === null) return null;
      const at = u32(value + 8);
      const [d, m, s] = [0, 1, 2].map((i) => u32(at + i * 8) / u32(at + i * 8 + 4));
      const degrees = d + m / 60 + s / 3600;
      const sign = 'SW'.includes(String.fromCharCode(buffer[tiff + ref + 8])) ? -1 : 1;
      return Number.isFinite(degrees) ? sign * degrees : null;
    };
    const lat = coordinate(1, 2);
    const lon = coordinate(3, 4);
    // Phones write 0,0 when they had no fix.
    return lat === null || lon === null || (lat === 0 && lon === 0) ? null : [lon, lat];
  });
  return {time: time ?? '', lonLat};
}

// Nominatim's usage policy: an identifying User-Agent, at most one request a second, and results cached.
const GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse';
const GEOCODE_AGENT = 'sqyc-places-photo-import/1.0';
const GEOCODE_INTERVAL = 1100;
const GEOCODE_CACHE = path.join(SOURCE_DIR, 'geocode-cache.json');
// The address field that names a photo's place, most specific settlement first.
const PLACE_FIELDS = ['village', 'hamlet', 'town', 'city', 'municipality', 'county', 'state'];

let geocodeCache = null;
let lastGeocode = 0;

/** The place a photo was taken, from OpenStreetMap; '' when it has no name there or the lookup fails. */
async function placeName([lon, lat]) {
  geocodeCache ??= await readManifest(GEOCODE_CACHE);
  // Three decimals is about 100m, close enough to share a settlement.
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  let address = geocodeCache[key];
  if (!address) {
    const wait = lastGeocode + GEOCODE_INTERVAL - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastGeocode = Date.now();
    const params = new URLSearchParams({lat: String(lat), lon: String(lon), format: 'jsonv2', zoom: '14', 'accept-language': 'en'});
    try {
      const response = await fetch(`${GEOCODE_URL}?${params}`, {headers: {'User-Agent': GEOCODE_AGENT}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      address = (await response.json()).address ?? {};
    } catch (error) {
      console.warn(`Could not look up ${key}: ${error.message}`);
      return '';
    }
    geocodeCache[key] = address;
    await writeFile(GEOCODE_CACHE, `${JSON.stringify(geocodeCache, null, 2)}\n`);
  }
  // A name OpenStreetMap has only in the local script is passed over for the next one; "Nilka County" reads "Nilka".
  const name = PLACE_FIELDS.map((field) => address[field]).find((value) => value && !/[^\p{Script=Latin}\p{N}\p{P}\s]/u.test(value));
  return name?.replace(/ (County|City|Town|Municipality|Kommune)$/, '') ?? '';
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
 * Gives a photo its photos.json entry if it has none, and an empty location the place from `lonLat`. The file is
 * read just before it is written, and nothing else in an existing entry is touched, so what you write there (even
 * while an import runs) is kept.
 */
async function addEntry(file, name, entry, lonLat) {
  const unplaced = (manifest) => !manifest[name]?.location?.trim();
  const place = lonLat && unplaced(await readManifest(file)) ? await placeName(lonLat) : '';
  // The lookup can take a second, so the file is read again after it.
  const manifest = await readManifest(file);
  const current = manifest[name];
  if (current && !(place && unplaced(manifest))) return;
  manifest[name] = {...(current ?? entry), location: place};
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** Puts photos.json in the folder's order: by file name, which is when each photo was taken. */
async function sortManifest(file) {
  const manifest = await readManifest(file);
  const names = Object.keys(manifest).sort((a, b) => a.localeCompare(b, 'en', {numeric: true}));
  const text = `${JSON.stringify(Object.fromEntries(names.map((name) => [name, manifest[name]])), null, 2)}\n`;
  if (text !== `${JSON.stringify(manifest, null, 2)}\n`) await writeFile(file, text);
}

async function main() {
  let imported = 0;
  for (const location of await folders(SOURCE_DIR)) {
    for (const gallery of await folders(path.join(SOURCE_DIR, location))) {
      const source = path.join(SOURCE_DIR, location, gallery);
      const target = path.join(PHOTOS_DIR, location, gallery);
      await mkdir(path.join(target, 'thumbs'), {recursive: true});
      const manifestFile = path.join(target, 'photos.json');
      await readManifest(manifestFile); // stop here, before converting anything, if it does not parse
      // Each photo is named for when it was taken, so name order is the gallery's order; a shared second gets -2, -3.
      const originals = [];
      for (const file of (await readdir(source)).filter((name) => ORIGINAL.test(name))) {
        const buffer = await readFile(path.join(source, file));
        const tags = exif(buffer);
        const time = tags.time || nameTime(file);
        if (time) originals.push({file, buffer, time, lonLat: tags.lonLat});
        else console.warn(`${location}/${gallery}/${file}: no date in the photo; start its name with one, e.g. `
          + `"2026-05-20 1430 ${file}", and import again`);
      }
      originals.sort((a, b) => a.time.localeCompare(b.time) || a.file.localeCompare(b.file));
      const taken = new Map();
      for (const {file, buffer, time, lonLat} of originals) {
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
          console.log(`${location}/${gallery}/${name} ← ${file}`);
        }
        await addEntry(manifestFile, name, {date: time.slice(0, 10), location: '', description: ''}, lonLat);
      }
      await sortManifest(manifestFile);
    }
  }
  console.log(imported ? `Imported ${imported} photos.` : 'No new photos in photos-src/.');
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'assets', 'sync-places-photos.mjs')], {stdio: 'inherit'});
  } catch {
    process.exitCode = 1;
  }
}

await main();
