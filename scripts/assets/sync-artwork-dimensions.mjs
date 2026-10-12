// Reads each artwork image and rewrites its width/height in data/artworks.ts (--check only reports).
// npm.cmd run sync:artwork-dimensions

import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {getDimensions} from './imageDimensions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARTWORKS_FILE = path.join(ROOT, 'data', 'artworks.ts');
const CHECK_ONLY = process.argv.includes('--check');

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
