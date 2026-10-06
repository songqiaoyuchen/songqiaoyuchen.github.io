// Contour build options from config or live Leva values, plus a cache key to detect geometry changes.
import type {ContourControlValues} from '@/components/scene/controls/useSceneControls';
import {
  CONTOUR_CONFIG,
  TERRAIN_MATERIAL_CONFIG,
  TERRAIN_MESH_CONFIG,
} from '@/config/scene';
import type {ContourBuildOptions} from './workerTypes';

type GeometryContourSettings = Pick<
  ContourControlValues,
  | 'chaikinIterations'
  | 'levels'
  | 'majorEvery'
  | 'majorMinHeight'
  | 'resampleSpacing'
  | 'shadowChance'
  | 'shadowOffset'
  | 'smoothIterations'
  | 'spacingJitter'
>;

export function getContourBuildOptions(
  settings: GeometryContourSettings = CONTOUR_CONFIG,
  seaLevel: number = TERRAIN_MATERIAL_CONFIG.seaLevel,
): ContourBuildOptions {
  return {
    chaikinIterations: settings.chaikinIterations,
    contrast: TERRAIN_MATERIAL_CONFIG.contrast,
    downsample: CONTOUR_CONFIG.downsample,
    levels: settings.levels,
    majorEvery: settings.majorEvery,
    majorMinHeight: settings.majorMinHeight,
    minLength: CONTOUR_CONFIG.minLength,
    planeSize: TERRAIN_MESH_CONFIG.planeSize,
    rdpEpsilon: CONTOUR_CONFIG.rdpEpsilon,
    resampleSpacing: settings.resampleSpacing,
    seaLevel,
    shadowChance: settings.shadowChance,
    shadowOffset: settings.shadowOffset,
    smoothFactor: CONTOUR_CONFIG.smoothFactor,
    smoothIterations: settings.smoothIterations,
    spacingJitter: settings.spacingJitter,
  };
}

export function getContourBuildKey(options: ContourBuildOptions) {
  return JSON.stringify(options);
}
