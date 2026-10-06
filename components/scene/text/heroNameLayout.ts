// Placement maths for SceneHeroName: puts the name at a screen position, at the scene links' median depth.
import {Vector3} from 'three';
import {SCENE_LINK_EFFECT_CONFIG, SCENE_LINKS, getCameraPose, SCENE_LAYOUT_CONFIG} from '@/config/scene';
import type {HeightGrid} from '@/lib/terrain/bake';
import {sampleHeight} from '@/lib/terrain/height';
import {getSceneLinkHeight} from '@/lib/text/sceneLinkGeometry';

type Terrain = {shellBase: HeightGrid; elevation: number; seaLevel: number};

/** Median camera distance of the scene links in their overview layout. */
export function linksMedianDepth(
  overview: readonly (readonly [number, number])[],
  viewportWidth: number,
  {shellBase, elevation, seaLevel}: Terrain,
) {
  const overviewPose = getCameraPose(
    null,
    viewportWidth < SCENE_LAYOUT_CONFIG.mobileMaxWidth,
  );
  const cameraPosition = new Vector3(...overviewPose.position);
  const distances = SCENE_LINKS.map((link) => {
    const [x, z] = overview[link.index];
    const y = sampleHeight(shellBase, x, z, elevation, seaLevel)
      + link.overviewBottomOffset
      + getSceneLinkHeight(link) * 0.5
      + SCENE_LINK_EFFECT_CONFIG.lift;
    return cameraPosition.distanceTo(new Vector3(x, y, z));
  }).sort((a, b) => a - b);
  return distances[Math.floor((distances.length - 1) * 0.5)];
}
