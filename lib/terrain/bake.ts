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

export interface TerrainMaps {
  /** Blurred + downsampled heights the vertex shader displaces with. */
  displacementMap: DataTexture;
  /** Sharp full-res height gradients the fragment shader lights with. */
  gradientMap: DataTexture;
}

// The material params (contrast, seaLevel, fadeHeight, ...) were tuned against
// the old 8-bit PNG heightmap, which was an sRGB-encoded export of this EXR.
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

// Displacement map: separable Gaussian blur, then 2x downsample.
function bakeDisplacementMap(heights: Float32Array, width: number, height: number): DataTexture {
  const radius = 6;
  const sigma = 2.5;
  const kernel = new Float32Array(radius * 2 + 1);
  let kSum = 0;
  for (let k = -radius; k <= radius; k++) {
    kernel[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma));
    kSum += kernel[k + radius];
  }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= kSum;

  const n = width * height;
  const tmp = new Float32Array(n);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        acc += kernel[k + radius] * heights[row + Math.min(Math.max(x + k, 0), width - 1)];
      }
      tmp[row + x] = acc;
    }
  }
  const blurred = new Float32Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        acc += kernel[k + radius] * tmp[Math.min(Math.max(y + k, 0), height - 1) * width + x];
      }
      blurred[y * width + x] = acc;
    }
  }

  const dw = width >> 1;
  const dh = height >> 1;
  const disp = new Uint16Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const i = y * 2 * width + x * 2;
      disp[y * dw + x] = DataUtils.toHalfFloat(
        (blurred[i] + blurred[i + 1] + blurred[i + width] + blurred[i + width + 1]) / 4,
      );
    }
  }
  return new DataTexture(disp, dw, dh, RedFormat, HalfFloatType);
}

/**
 * Bakes both terrain textures from one EXR heightmap (the game-terrain split):
 *  - displacementMap: blurred + downsampled heights — a 512-segment mesh cannot
 *    represent sub-vertex detail, so it is removed before it can alias.
 *  - gradientMap: sharp full-res height gradients — lighting detail lives here,
 *    independent of mesh density.
 */
export function bakeTerrainMaps(image: HeightmapImage): TerrainMaps {
  const heights = decodeHeights(image);
  const gradientMap = bakeGradientMap(heights, image.width, image.height);
  const displacementMap = bakeDisplacementMap(heights, image.width, image.height);

  for (const tex of [gradientMap, displacementMap]) {
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.wrapS = ClampToEdgeWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
  }
  return { displacementMap, gradientMap };
}
