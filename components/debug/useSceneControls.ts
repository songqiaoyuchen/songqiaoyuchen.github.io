import {useControls} from 'leva';
import {FOG_CONFIG} from '@/config/scene';
import {useContourControls} from './useContourControls';
import {usePostControls} from './usePostControls';
import {useTerrainControls} from './useTerrainControls';
import {useLinkStreamControls} from './useLinkStreamControls';

export function useSceneControls() {
  const terrain = useTerrainControls();
  const contours = useContourControls();
  const fog = useControls('Fog', {
    near: {value: FOG_CONFIG.near, min: 0, max: 20, step: 0.5, label: 'Near'},
    far: {value: FOG_CONFIG.far, min: 2, max: 50, step: 0.5, label: 'Far'},
  });
  const postProcessing = usePostControls();
  const linkStreams = useLinkStreamControls();

  return {terrain, contours, fog, postProcessing, linkStreams};
}

export type SceneControlValues = ReturnType<typeof useSceneControls>;
export type TerrainControlValues = SceneControlValues['terrain'];
export type ContourControlValues = SceneControlValues['contours'];
export type FogControlValues = SceneControlValues['fog'];
export type LinkStreamControlValues = SceneControlValues['linkStreams'];
