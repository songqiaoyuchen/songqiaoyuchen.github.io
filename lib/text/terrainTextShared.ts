import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  type Texture,
} from 'three';
import { TERRAIN_CONFIG } from '@/config/terrain';
import {
  bakeTerrainMaps,
  type HeightGrid,
  type HeightmapImage,
} from '@/lib/terrain/bake';

const terrainMapCache = new WeakMap<object, ReturnType<typeof bakeTerrainMaps>>();

export function getTerrainTextMaps(image: HeightmapImage) {
  const key = image as object;
  const cached = terrainMapCache.get(key);
  if (cached) return cached;
  const maps = bakeTerrainMaps(image);
  terrainMapCache.set(key, maps);
  return maps;
}

export function configureSdfAtlas(texture: Texture) {
  texture.colorSpace = NoColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}

export function configureBitmapAtlas(texture: Texture) {
  texture.colorSpace = NoColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
}

export function sampleTerrainHeight(
  grid: HeightGrid,
  x: number,
  z: number,
  elevation: number,
  seaLevel: number,
): number {
  const u = Math.min(1, Math.max(0, x / TERRAIN_CONFIG.mesh.planeSize + 0.5));
  const v = Math.min(1, Math.max(0, 0.5 - z / TERRAIN_CONFIG.mesh.planeSize));
  const gx = u * (grid.width - 1);
  const gy = v * (grid.height - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, grid.width - 1);
  const y1 = Math.min(y0 + 1, grid.height - 1);
  const tx = gx - x0;
  const ty = gy - y0;
  const a = grid.data[y0 * grid.width + x0];
  const b = grid.data[y0 * grid.width + x1];
  const c = grid.data[y1 * grid.width + x0];
  const d = grid.data[y1 * grid.width + x1];
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  const raw = top + (bottom - top) * ty;
  const curved = Math.pow(Math.max(raw, 0), TERRAIN_CONFIG.material.contrast);
  const height = Math.min(1, Math.max(0, (curved - seaLevel) / Math.max(1 - seaLevel, 0.0001)));
  return TERRAIN_CONFIG.mesh.position[1] + height * elevation + 0.08;
}

export function random01(index: number, salt: number, seed: number): number {
  const value = Math.sin((index + seed) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function randomBetween(min: number, max: number, value: number): number {
  return min + (max - min) * value;
}
