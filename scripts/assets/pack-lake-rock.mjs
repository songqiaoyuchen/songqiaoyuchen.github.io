// Packs a scanned rock's maps into the one texture the lake dive's walls read (public/textures/lake/cliff-1k.webp):
// R, G = the normal map's x, y (OpenGL convention), B = displacement (height), A = ambient occlusion.
// Usage: node scripts/assets/pack-lake-rock.mjs <dir with cliff_side_{nor_gl,disp,ao}_2k.png> [out.webp] [size=1024]
// The source set is Poly Haven's "Cliff Side" (CC0): https://polyhaven.com/a/cliff_side (2K PNG maps).
import path from 'node:path';
import sharp from 'sharp';

const [src, out = 'public/textures/lake/cliff-1k.webp', sizeArg = '1024'] = process.argv.slice(2);
if (!src) {
  console.error('usage: node scripts/assets/pack-lake-rock.mjs <srcDir> [out.webp] [size=1024]');
  process.exit(1);
}
const size = Number(sizeArg);
const channel = async (name) => {
  const {data, info} = await sharp(path.join(src, name)).resize(size, size, {kernel: 'lanczos3'})
    .toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject: true});
  return {data, stride: info.channels};
};
const normal = await channel('cliff_side_nor_gl_2k.png');
const height = await channel('cliff_side_disp_2k.png');
const occlusion = await channel('cliff_side_ao_2k.png');
const packed = Buffer.alloc(size * size * 4);
for (let i = 0; i < size * size; i++) {
  packed[i * 4] = normal.data[i * normal.stride];
  packed[i * 4 + 1] = normal.data[i * normal.stride + 1];
  packed[i * 4 + 2] = height.data[i * height.stride];
  packed[i * 4 + 3] = occlusion.data[i * occlusion.stride];
}
const info = await sharp(packed, {raw: {width: size, height: size, channels: 4}})
  .webp({quality: 88, alphaQuality: 90, effort: 6}).toFile(out);
console.log(`${out}: ${size}px, ${(info.size / 1e6).toFixed(2)} MB`);
