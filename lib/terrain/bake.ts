import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RedFormat,
  RGFormat,
} from 'three';
import { TERRAIN_CONFIG } from '@/config/terrain';

export interface HeightmapImage {
  data: Uint16Array | Float32Array;
  width: number;
  height: number;
}

type HeightmapImageInput = {
  data?: unknown;
  width?: unknown;
  height?: unknown;
};

export function toHeightmapImage(input: unknown): HeightmapImage {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid EXR image: expected object with data/width/height');
  }
  const { data, width, height } = input as HeightmapImageInput;
  const validData = data instanceof Uint16Array || data instanceof Float32Array;
  const validWidth = typeof width === 'number' && Number.isFinite(width) && width > 0;
  const validHeight = typeof height === 'number' && Number.isFinite(height) && height > 0;
  if (!validData || !validWidth || !validHeight) {
    throw new Error('Invalid EXR image: expected typed array data and positive width/height');
  }
  return { data, width, height };
}

export interface HeightGrid {
  data: Float32Array;
  width: number;
  height: number;
}

export interface TerrainMaps {
  /** Blurred + downsampled heights the vertex shader displaces with. */
  displacementMap: DataTexture;
  /** Sharp full-res height gradients the fragment shader lights with. */
  gradientMap: DataTexture;
  /** Float copy of the displacement grid — source data for the contour shell. */
  shellBase: HeightGrid;
}

// The material params (contrast, seaLevel, ...) were tuned against the old
// 8-bit PNG heightmap, which was an sRGB-encoded export of this EXR.
// Re-encoding the linear EXR heights with the same sRGB curve feeds the shader
// identical values — same landform, same look — but in float precision, which
// removes the terracing caused by the PNG's 8-bit quantization.
function toSRGB(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// EXR scanlines arrive bottom-up, matching the old flipY PNG upload, so no row flip.
function decodeHeights({ data, width, height }: HeightmapImage): Float32Array {
  const stride = data.length / (width * height);
  const isHalf = data instanceof Uint16Array;
  const heights = new Float32Array(width * height);
  for (let i = 0; i < heights.length; i++) {
    const raw = data[i * stride];
    heights[i] = toSRGB(isHalf ? DataUtils.fromHalfFloat(raw) : raw);
  }
  return heights;
}

// Gradient map: d(pow(height, contrast)) per world unit along the local plane
// axes. contrast is baked (not Leva-exposed); seaLevel and elevation are
// applied live in the fragment shader, keeping the Leva controls functional.
function bakeGradientMap(heights: Float32Array, width: number, height: number): DataTexture {
  const contrast = TERRAIN_CONFIG.material.contrast;
  const n = width * height;
  const curved = new Float32Array(n);
  for (let i = 0; i < n; i++) curved[i] = Math.pow(heights[i], contrast);

  const texelWorld = TERRAIN_CONFIG.mesh.planeSize / width;
  const grad = new Uint16Array(n * 2);
  for (let y = 0; y < height; y++) {
    const rowD = Math.max(y - 1, 0) * width;
    const rowU = Math.min(y + 1, height - 1) * width;
    const row = y * width;
    const dy = (rowU - rowD) / width; // 1 or 2 texels
    for (let x = 0; x < width; x++) {
      const xL = Math.max(x - 1, 0);
      const xR = Math.min(x + 1, width - 1);
      grad[(row + x) * 2] = DataUtils.toHalfFloat((curved[row + xR] - curved[row + xL]) / ((xR - xL) * texelWorld));
      grad[(row + x) * 2 + 1] = DataUtils.toHalfFloat((curved[rowU + x] - curved[rowD + x]) / (dy * texelWorld));
    }
  }
  return new DataTexture(grad, width, height, RGFormat, HalfFloatType);
}

// Sliding-window box blur: each output sample is the mean of a (2r+1)-wide
// window, updated in O(1) per pixel (add the incoming sample, drop the
// outgoing one) rather than resumming the whole window — makes the radius
// effectively free, which matters once sigma scales up with source
// resolution (see bakeDisplacementMap below).
function boxBlur1D(src: Float32Array, w: number, h: number, horizontal: boolean, radius: number): Float32Array {
  const dst = new Float32Array(w * h);
  const norm = 1 / (radius * 2 + 1);
  if (horizontal) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -radius; x <= radius; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        dst[row + x] = sum * norm;
        sum += src[row + Math.min(w - 1, x + radius + 1)] - src[row + Math.max(0, x - radius)];
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) sum += src[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum * norm;
        sum += src[Math.min(h - 1, y + radius + 1) * w + x] - src[Math.max(0, y - radius) * w + x];
      }
    }
  }
  return dst;
}

// Three box-blur passes approximate a Gaussian of the same sigma (a standard
// substitution — see e.g. Kovesi's "Fast Almost-Gaussian Filtering"): each
// box of half-width r contributes variance r(r+1)/3, so three of them sum to
// ≈ r², giving r ≈ sigma. Using this instead of a literal Gaussian kernel
// keeps blur cost independent of sigma, which is what makes scaling sigma
// with resolution (below) affordable.
function gaussianBlurApprox(heights: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.round((-1 + Math.sqrt(1 + 4 * sigma * sigma)) / 2));
  let field = heights;
  for (let pass = 0; pass < 3; pass++) {
    field = boxBlur1D(field, width, height, true, r);
    field = boxBlur1D(field, width, height, false, r);
  }
  return field;
}

// Displacement map: blur, then downsample.
//
// Blur sigma and downsample factor are derived from the source resolution
// relative to the mesh's own vertex density (TERRAIN_CONFIG.mesh.segments),
// not hardcoded — a fixed sigma/downsample tuned in source-texel units looks
// right for whichever resolution it was tuned against, but silently under-
// blurs (and reintroduces terracing) if the source heightmap is swapped for
// a higher-resolution one, since the same texel-count blur then covers less
// world-space distance. Scaling both with `width` keeps the effective
// world-space blur — and the displacement map's resolution relative to the
// mesh — constant no matter what the source resolution is. The sigma/factor
// ratio (3x) was chosen empirically: matching the *original* hardcoded
// values exactly (radius=6, sigma=2.5 at 2x downsample) turned out to
// under-blur once tested against an actual higher-resolution replacement
// heightmap, so this uses a more generous ratio validated to bring a 4097px
// source's mesh-vertex height deltas back in line with the known-good
// 2048px source's, at the cost of very slightly softening the 2048px case
// too (measured as a smoothness *improvement* there, not a regression).
function bakeDisplacementMap(
  heights: Float32Array,
  width: number,
  height: number,
): { texture: DataTexture; grid: HeightGrid } {
  const targetRes = TERRAIN_CONFIG.mesh.segments;
  const factor = Math.max(1, Math.round(width / (2 * targetRes)));
  const sigma = 3 * factor;
  const blurred = gaussianBlurApprox(heights, width, height, sigma);

  const dw = Math.max(1, Math.floor(width / factor));
  const dh = Math.max(1, Math.floor(height / factor));
  const gridData = new Float32Array(dw * dh);
  const disp = new Uint16Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      let sum = 0;
      for (let by = 0; by < factor; by++) {
        const rowOff = (y * factor + by) * width;
        for (let bx = 0; bx < factor; bx++) {
          sum += blurred[rowOff + x * factor + bx];
        }
      }
      const avg = sum / (factor * factor);
      gridData[y * dw + x] = avg;
      disp[y * dw + x] = DataUtils.toHalfFloat(avg);
    }
  }
  return {
    texture: new DataTexture(disp, dw, dh, RedFormat, HalfFloatType),
    grid: { data: gridData, width: dw, height: dh },
  };
}

/**
 * Jacobi-style Laplacian smoothing over a height grid — the CPU equivalent of
 * Blender's Laplacian Smooth modifier (factor 1.0, repeat N). Each iteration
 * pulls interior samples toward the average of their 4 neighbors; borders are
 * left untouched so the grid edge stays pinned.
 *
 */
function laplacianSmooth(grid: HeightGrid, iterations: number, factor: number): Float32Array {
  const { width, height } = grid;
  let src = Float32Array.from(grid.data);
  if (iterations <= 0 || factor === 0) return src;
  let dst = new Float32Array(src.length);
  for (let it = 0; it < iterations; it++) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const i = row + x;
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          dst[i] = src[i];
          continue;
        }
        const avg = (src[i - 1] + src[i + 1] + src[i - width] + src[i + width]) * 0.25;
        dst[i] = src[i] + (avg - src[i]) * factor;
      }
    }
    [src, dst] = [dst, src];
  }
  return src;
}

// Separable morphological dilation: each sample becomes the max over a
// (2r+1)² window. Lifts the field to its local maxima so a smoothing pass
// stays above the original terrain instead of cutting through peaks.
function dilate(grid: HeightGrid, radius: number): HeightGrid {
  const { data, width, height } = grid;
  const tmp = new Float32Array(data.length);
  const out = new Float32Array(data.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let m = -Infinity;
      const x0 = Math.max(x - radius, 0);
      const x1 = Math.min(x + radius, width - 1);
      for (let k = x0; k <= x1; k++) if (data[row + k] > m) m = data[row + k];
      tmp[row + x] = m;
    }
  }
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(y - radius, 0);
    const y1 = Math.min(y + radius, height - 1);
    for (let x = 0; x < width; x++) {
      let m = -Infinity;
      for (let k = y0; k <= y1; k++) if (tmp[k * width + x] > m) m = tmp[k * width + x];
      out[y * width + x] = m;
    }
  }
  return { data: out, width, height };
}

/**
 * Smoothed shell height field. Shrink-wrap construction: dilate up to local
 * maxima, smooth that freely, then clamp to the base heights as a safety
 * net — the shell wraps the landform from outside with a rounded silhouette
 * instead of sinking into ridges (plain smoothing lowers peaks below the
 * base surface). Contour polylines are extracted from this grid.
 */
export function bakeShellGrid(grid: HeightGrid, iterations: number, factor: number): HeightGrid {
  // Dilation radius scales with how far the smoothing diffuses (sigma ≈ √(it/2)).
  const radius = Math.ceil(Math.sqrt(Math.max(iterations, 1))) + 1;
  const smoothed = laplacianSmooth(dilate(grid, radius), iterations, factor);
  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] < grid.data[i]) smoothed[i] = grid.data[i];
  }
  return { data: smoothed, width: grid.width, height: grid.height };
}

/**
 * Bakes both terrain textures from one EXR heightmap (the game-terrain split):
 *  - displacementMap: blurred + downsampled heights — a 512-segment mesh cannot
 *    represent sub-vertex detail, so it is removed before it can alias.
 *  - gradientMap: sharp full-res height gradients — lighting detail lives here,
 *    independent of mesh density.
 */
export function bakeTerrainMaps(image: HeightmapImage): TerrainMaps {
  const cached = bakeCache.get(image);
  if (cached) return cached;

  const heights = decodeHeights(image);
  const gradientMap = bakeGradientMap(heights, image.width, image.height);
  const { texture: displacementMap, grid: shellBase } = bakeDisplacementMap(heights, image.width, image.height);

  for (const tex of [gradientMap, displacementMap]) {
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.wrapS = ClampToEdgeWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
  }
  const maps = { displacementMap, gradientMap, shellBase };
  bakeCache.set(image, maps);
  return maps;
}

// Both the base terrain and the contour shell bake from the same EXR image,
// so the decode/blur/gradient work is shared across meshes.
const bakeCache = new WeakMap<HeightmapImage, TerrainMaps>();
