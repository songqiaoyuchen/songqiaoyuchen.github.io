// All homepage scene Leva folders in panel order; each group key is also its dev-config save scope.
// Folders appear per section (sectionScope.ts); every hook stays mounted so tuned values survive section changes.
// In production Leva is hidden and every value equals its config default.
import type {SectionId} from '@/data/sections';
import {useSectionScope} from './sectionScope';
import {useAboutPathControls} from './useAboutPathControls';
import {useCameraJourneyControls} from './useCameraJourneyControls';
import {useContourControls} from './useContourControls';
import {useFogControls} from './useFogControls';
import {useGlyphRainControls} from './useGlyphRainControls';
import {useIntroControls} from './useIntroControls';
import {useLakeControls} from './useLakeControls';
import {usePostControls} from './usePostControls';
import {useSceneLinkControls} from './useSceneLinkControls';
import {useTerrainControls} from './useTerrainControls';
import {usePlacesControls} from './usePlacesControls';

export function useSceneControls(activeId: SectionId | null) {
  useSectionScope(activeId);
  const terrain = useTerrainControls();
  const contours = useContourControls();
  const fog = useFogControls();
  const intro = useIntroControls();
  const postProcessing = usePostControls();
  const sceneLinks = useSceneLinkControls();
  const glyphRain = useGlyphRainControls();
  const aboutPath = useAboutPathControls();
  const {places, placesOverview, placesLocation} = usePlacesControls();
  const cameraJourney = useCameraJourneyControls();
  const lake = useLakeControls();

  return {
    terrain, contours, fog, intro, postProcessing, sceneLinks, glyphRain, aboutPath,
    places, placesOverview, placesLocation,
    cameraJourney, lake,
  };
}

export type SceneControlValues = ReturnType<typeof useSceneControls>;
export type TerrainControlValues = SceneControlValues['terrain'];
export type ContourControlValues = SceneControlValues['contours'];
export type FogControlValues = SceneControlValues['fog'];
export type IntroControlValues = SceneControlValues['intro'];
export type SceneLinkControlValues = SceneControlValues['sceneLinks'];
export type GlyphRainControlValues = SceneControlValues['glyphRain'];
export type AboutPathControlValues = SceneControlValues['aboutPath'];
export type PlacesControlValues = SceneControlValues['places'];
export type PlacesOverviewControlValues = SceneControlValues['placesOverview'];
export type PlacesLocationControlValues = SceneControlValues['placesLocation'];
export type LakeControlValues = SceneControlValues['lake'];
