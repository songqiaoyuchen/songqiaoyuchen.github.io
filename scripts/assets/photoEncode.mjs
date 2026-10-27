// Photo originals (HEIC, JPEG, PNG…) to WebP for the static export, which serves files as they are: upright,
// resized, sRGB, no metadata. Shared by import-places-photos.mjs and import-letter-photos.mjs.

import {crc32, deflateSync} from 'node:zlib';
import decodeHeic from 'heic-decode';
import sharp from 'sharp';

export const ORIGINAL = /\.(heic|heif|jpe?g|png|webp|tiff?)$/i;
const HEIC = /\.hei[cf]$/i;

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
export async function readable(file, buffer) {
  if (!HEIC.test(file)) return buffer;
  const {width, height, data} = await decodeHeic({buffer});
  const png = await sharp(data, {raw: {width, height, channels: 4}}).png({compressionLevel: 0}).toBuffer();
  const icc = heicProfile(buffer);
  return icc ? withProfile(png, icc) : png;
}

/** Writes `input` to `file` as WebP within `size` px on its long edge. */
export async function encode(input, {size, quality}, file) {
  // sharp keeps no metadata unless asked, and converts a tagged image to sRGB on the way out.
  await sharp(input)
    .rotate()
    .resize({width: size, height: size, fit: 'inside', withoutEnlargement: true})
    .webp({quality, effort: 5})
    .toFile(file);
}
