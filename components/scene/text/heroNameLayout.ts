// Placement maths for SceneHeroName: desktop puts the name at a screen position at the scene links' median depth;
// mobile lays it over the HTML name.
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

/** Screen box of the mobile HTML name, which the WebGL name covers; null until the hero is laid out. */
export function measureHeroNameSlot() {
  const slot = [...document.querySelectorAll<HTMLElement>('[data-hero-name-slot]')]
    .find((element) => element.offsetWidth > 0);
  const section = slot?.offsetParent;
  const placement = section instanceof HTMLElement ? section.offsetParent : null;
  if (!slot || !(section instanceof HTMLElement) || !placement) return null;
  // Offsets skip the hero's entrance and hide transforms, so the box is where the name settles.
  const origin = placement.getBoundingClientRect();
  return {
    left: origin.left + section.offsetLeft + slot.offsetLeft,
    top: origin.top + section.offsetTop + slot.offsetTop,
    width: slot.offsetWidth,
    height: slot.offsetHeight,
  };
}
