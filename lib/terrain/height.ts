// CPU terrain height sampling, matching the vertex shader, for placing scene text on the surface.
import {TERRAIN_MATERIAL_CONFIG, TERRAIN_MESH_CONFIG} from '@/config/scene';
import type {HeightGrid} from './bake';

/** Terrain height at world x/z normalized to 0..1, as contour levels measure it. */
export function sampleNormalizedHeight(
  grid: HeightGrid,
  x: number,
  z: number,
  seaLevel: number,
) {
  const u = Math.min(1, Math.max(0, x / TERRAIN_MESH_CONFIG.planeSize + 0.5));
  const v = Math.min(1, Math.max(0, 0.5 - z / TERRAIN_MESH_CONFIG.planeSize));
  const gridX = u * (grid.width - 1);
  const gridY = v * (grid.height - 1);
  const x0 = Math.floor(gridX);
  const y0 = Math.floor(gridY);
  const x1 = Math.min(x0 + 1, grid.width - 1);
  const y1 = Math.min(y0 + 1, grid.height - 1);
  const xMix = gridX - x0;
  const yMix = gridY - y0;
  const topLeft = grid.data[y0 * grid.width + x0];
  const topRight = grid.data[y0 * grid.width + x1];
  const bottomLeft = grid.data[y1 * grid.width + x0];
  const bottomRight = grid.data[y1 * grid.width + x1];
  const top = topLeft + (topRight - topLeft) * xMix;
  const bottom = bottomLeft + (bottomRight - bottomLeft) * xMix;
  const raw = top + (bottom - top) * yMix;
  return normalizeRawHeight(raw, seaLevel);
}

/** Raw shell value to normalized height: the terrain's contrast curve above sea level. */
export function normalizeRawHeight(raw: number, seaLevel: number) {
  const curved = Math.pow(Math.max(raw, 0), TERRAIN_MATERIAL_CONFIG.contrast);
  return Math.min(1, Math.max(0, (curved - seaLevel) / Math.max(1 - seaLevel, 0.0001)));
}

export function sampleHeight(
  grid: HeightGrid,
  x: number,
  z: number,
  elevation: number,
  seaLevel: number,
) {
  return TERRAIN_MESH_CONFIG.position[1] + sampleNormalizedHeight(grid, x, z, seaLevel) * elevation + 0.08;
}

/**
 * Height of the rendered terrain surface at world x/z, with no clearance: the plane (TERRAIN_MESH_CONFIG.segments
 * per side) takes the heightmap at its vertices, so between them the surface runs straight and can sit below the
 * grid's own height. Interpolates the four surrounding vertices; the cell's diagonal split is ignored.
 */
export function sampleSurfaceHeight(
  grid: HeightGrid,
  x: number,
  z: number,
  elevation: number,
  seaLevel: number,
) {
  const {planeSize, segments} = TERRAIN_MESH_CONFIG;
  const cell = planeSize / segments;
  const column = Math.min(Math.max((x + planeSize / 2) / cell, 0), segments);
  const row = Math.min(Math.max((z + planeSize / 2) / cell, 0), segments);
  const column0 = Math.min(Math.floor(column), segments - 1);
  const row0 = Math.min(Math.floor(row), segments - 1);
  const xMix = column - column0;
  const zMix = row - row0;
  const vertex = (c: number, r: number) => (
    sampleNormalizedHeight(grid, c * cell - planeSize / 2, r * cell - planeSize / 2, seaLevel)
  );
  const near = vertex(column0, row0) + (vertex(column0 + 1, row0) - vertex(column0, row0)) * xMix;
  const far = vertex(column0, row0 + 1) + (vertex(column0 + 1, row0 + 1) - vertex(column0, row0 + 1)) * xMix;
  return TERRAIN_MESH_CONFIG.position[1] + (near + (far - near) * zMix) * elevation;
}
