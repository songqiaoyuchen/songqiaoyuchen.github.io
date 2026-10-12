// Reads an image's pixel size from its header: PNG, JPEG, GIF and WebP. Shared by the asset sync scripts.

function readPngDimensions(buffer) {
  return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
}

function readGifDimensions(buffer) {
  return {width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8)};
}

/** The EXIF orientation (1–8) in a JPEG APP1 segment's data, or 1. */
function readExifOrientation(buffer, start) {
  if (buffer.toString('ascii', start, start + 6) !== 'Exif\0\0') return 1;
  const tiff = start + 6;
  const little = buffer.toString('ascii', tiff, tiff + 2) === 'II';
  const u16 = (at) => (little ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at));
  const u32 = (at) => (little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at));
  const ifd = tiff + u32(tiff + 4);
  for (let entry = 0; entry < u16(ifd); entry++) {
    const at = ifd + 2 + entry * 12;
    if (u16(at) === 0x0112) return u16(at + 8);
  }
  return 1;
}

/** A JPEG's size as displayed: an EXIF orientation of 5 to 8 (a quarter turn) swaps the stored width and height. */
function readJpegDimensions(buffer) {
  let offset = 2;
  let orientation = 1;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw new Error('Invalid JPEG marker');
    while (buffer[offset] === 0xff) offset += 1;

    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;

    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) throw new Error('Invalid JPEG segment');

    if (marker === 0xe1) orientation = readExifOrientation(buffer, offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      return orientation >= 5 ? {width: height, height: width} : {width, height};
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

export function getDimensions(buffer) {
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
