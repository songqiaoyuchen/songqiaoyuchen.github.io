// All homepage scene Leva folders in panel order; each group key is also its dev-config save scope.
// In production Leva is hidden and every value equals its config default.
import {useContourControls} from './useContourControls';
import {useFogControls} from './useFogControls';
import {useGlyphRainControls} from './useGlyphRainControls';
import {usePostControls} from './usePostControls';
import {useSceneLinkControls} from './useSceneLinkControls';
import {useTerrainControls} from './useTerrainControls';

export function useSceneControls() {
  const terrain = useTerrainControls();
  const contours = useContourControls();
  const fog = useFogControls();
  const postProcessing = usePostControls();
  const sceneLinks = useSceneLinkControls();
  const glyphRain = useGlyphRainControls();

  return {terrain, contours, fog, postProcessing, sceneLinks, glyphRain};
}

export type SceneControlValues = ReturnType<typeof useSceneControls>;
export type TerrainControlValues = SceneControlValues['terrain'];
export type ContourControlValues = SceneControlValues['contours'];
export type FogControlValues = SceneControlValues['fog'];
export type SceneLinkControlValues = SceneControlValues['sceneLinks'];
export type GlyphRainControlValues = SceneControlValues['glyphRain'];
