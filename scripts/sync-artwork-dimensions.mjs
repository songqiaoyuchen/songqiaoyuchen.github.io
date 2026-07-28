import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTWORKS_FILE = path.join(ROOT, 'data', 'artworks.ts');
const CHECK_ONLY = process.argv.includes('--check');

function readPngDimensions(buffer) {
  return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
}

function readGifDimensions(buffer) {
  return {width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8)};
}

function readJpegDimensions(buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw new Error('Invalid JPEG marker');
    while (buffer[offset] === 0xff) offset += 1;

    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;

    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) throw new Error('Invalid JPEG segment');

    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += length;
  }

  throw new Error('JPEG does not contain a frame size');
}

function readWebpDimensions(buffer) {
  const chunkType = buffer.toString('ascii', 12, 16);

  if (chunkType === 'VP8X') {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  if (chunkType === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunkType === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }

  throw new Error(`Unsupported WebP encoding: ${chunkType}`);
}

function getDimensions(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return readPngDimensions(buffer);
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return readJpegDimensions(buffer);
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') {
    return readGifDimensions(buffer);
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return readWebpDimensions(buffer);
  }

  throw new Error('Unsupported image format (PNG, JPEG, GIF, and WebP are supported)');
}

async function main() {
  const source = await readFile(ARTWORKS_FILE, 'utf8');
  const artworkPattern = /(?<prefix>src:\s*'(?<src>\/[^']+)'[\s\S]{0,300}?width:\s*)(?<width>\d+)(?<between>\s*,\s*height:\s*)(?<height>\d+)/g;
  const updates = [];

  let cursor = 0;
  let nextSource = '';
  let artworkCount = 0;

  for (const match of source.matchAll(artworkPattern)) {
    const {groups, index = 0} = match;
    if (!groups) throw new Error('Could not parse artwork image fields');

    const imagePath = path.join(ROOT, 'public', groups.src);
    const dimensions = getDimensions(await readFile(imagePath));
    const current = `${groups.width} × ${groups.height}`;
    const actual = `${dimensions.width} × ${dimensions.height}`;

    if (current !== actual) updates.push(`${groups.src}: ${current} → ${actual}`);
    artworkCount += 1;
    nextSource += source.slice(cursor, index);
    nextSource += `${groups.prefix}${dimensions.width}${groups.between}${dimensions.height}`;
    cursor = index + match[0].length;
  }
  nextSource += source.slice(cursor);

  if (artworkCount === 0) {
    throw new Error('No artwork image fields were found in data/artworks.ts');
  }

  if (updates.length === 0) {
    console.log('Artwork dimensions are already in sync.');
    return;
  }

  console.log(`Artwork dimensions to update:\n${updates.map((update) => `- ${update}`).join('\n')}`);
  if (CHECK_ONLY) process.exitCode = 1;
  else await writeFile(ARTWORKS_FILE, nextSource);
}

await main();
