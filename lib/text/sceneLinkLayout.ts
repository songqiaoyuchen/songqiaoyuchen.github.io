// Scene link placement: projects screen-space slots onto the terrain for overview, focused and mobile layouts.
import {MathUtils, PerspectiveCamera, Ray, Vector2, Vector3} from 'three';
import {
  SCENE_LINK_LAYOUT,
  MOBILE_SCENE_LINK_CONFIG,
  type SceneLink,
  type MobileSceneLinkSettings,
} from '@/config/scene/sceneLinks';
import type {SectionId} from '@/data/sections';
import {
  CAMERA_CONFIG,
  getCameraPose,
  SCENE_LAYOUT_CONFIG,
  TERRAIN_MESH_CONFIG,
} from '@/config/scene';
import type {HeightGrid} from '@/lib/terrain/bake';
import {sampleHeight} from '@/lib/terrain/height';
import {getHomeFov} from '@/lib/scene/camera';
import {getSceneLinkHeight} from './sceneLinkGeometry';

export type SceneLinkLayoutMode = 'overview-mobile' | 'overview' | 'focused';

type DesktopMode = Extract<SceneLinkLayoutMode, 'overview' | 'focused'>;
type LayoutPosition = [number, number];

interface ProjectedPosition {
  position: LayoutPosition;
  distance: number;
}

const DEPTH_SEARCH_STEPS = 12;
const INTERSECTION_STEPS = 18;
const INTERSECTION_DISTANCE = 50;

export function getSceneLinkLayoutMode(isFocused: boolean, width: number): SceneLinkLayoutMode {
  const isMobile = width < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  if (isMobile) return 'overview-mobile';
  return isFocused ? 'focused' : 'overview';
}

function makeMobileOverviewSlots(
  links: readonly SceneLink[],
  settings: MobileSceneLinkSettings,
) {
  return links.map((link, index) => {
    const progress = links.length === 1 ? 0.5 : index / (links.length - 1);
    return new Vector2(
      settings.mobileStartX
        + (settings.mobileEndX - settings.mobileStartX) * progress,
      settings.mobileCenterY + link.overviewYOffset,
    );
  });
}

function makeOverviewSlots(
  links: readonly SceneLink[],
  width: number,
  mobileSettings: MobileSceneLinkSettings,
) {
  if (width < SCENE_LAYOUT_CONFIG.mobileMaxWidth) {
    return makeMobileOverviewSlots(links, mobileSettings);
  }

  const {startX, endX, centerY} = SCENE_LINK_LAYOUT.overview.desktop;
  return links.map((link, index) => {
    const progress = links.length === 1 ? 0.5 : index / (links.length - 1);
    return new Vector2(
      startX + (endX - startX) * progress,
      centerY + link.overviewYOffset,
    );
  });
}

function applyFocusedOrder<T>(
  links: readonly SceneLink[],
  slots: readonly T[],
) {
  return links.map((link) => {
    const slotIndex = SCENE_LINK_LAYOUT.focused.order.indexOf(link.id);
    return slots[slotIndex] ?? slots[link.index];
  });
}

function makeFocusedSlots(links: readonly SceneLink[]) {
  const slots = Array.from({length: links.length}, (_, index) => {
    const count = links.length;
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const {startX, endX, centerY} = SCENE_LINK_LAYOUT.focused;
    const x = startX + (endX - startX) * progress;
    return new Vector2(x, centerY);
  });
  return applyFocusedOrder(links, slots);
}

function makeCamera(
  width: number,
  height: number,
  mode: DesktopMode,
  focusedSectionId: SectionId | null = null,
) {
  const isMobileOverview = mode === 'overview'
    && width < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const pose = getCameraPose(
    mode === 'focused' ? focusedSectionId ?? 'projects' : null,
    isMobileOverview,
  );
  const camera = new PerspectiveCamera(
    getHomeFov(width, height, CAMERA_CONFIG.fov, SCENE_LAYOUT_CONFIG),
    width / Math.max(height, 1),
    0.1,
    100,
  );
  camera.position.fromArray(pose.position);
  camera.lookAt(new Vector3().fromArray(pose.lookAt));
  camera.updateMatrixWorld(true);
  return camera;
}

function pushAwayFromCamera(
  position: LayoutPosition,
  camera: PerspectiveCamera,
  distance: number,
): LayoutPosition {
  if (distance <= 0) return position;

  const offsetX = position[0] - camera.position.x;
  const offsetZ = position[1] - camera.position.z;
  const horizontalDistance = Math.hypot(offsetX, offsetZ);
  if (horizontalDistance === 0) return position;

  return [
    position[0] + offsetX / horizontalDistance * distance,
    position[1] + offsetZ / horizontalDistance * distance,
  ];
}

function projectSlot(
  slot: Vector2,
  camera: PerspectiveCamera,
  centerOffset: number,
  heightGrid: HeightGrid,
  elevation: number,
  seaLevel: number,
): ProjectedPosition {
  const rayEnd = new Vector3(slot.x, slot.y, 0.5).unproject(camera);
  const ray = new Ray(camera.position, rayEnd.sub(camera.position).normalize());
  const point = new Vector3();
  function distanceFromTerrain(distance: number) {
    ray.at(distance, point);
    return point.y - (
      sampleHeight(
        heightGrid,
        point.x,
        point.z,
        elevation,
        seaLevel,
      ) + centerOffset
    );
  }

  let near = 0;
  let far = INTERSECTION_DISTANCE;
  let nearDistance = distanceFromTerrain(near);
  const farDistance = distanceFromTerrain(far);

  if (nearDistance * farDistance <= 0) {
    for (let step = 0; step < INTERSECTION_STEPS; step++) {
      const middle = (near + far) * 0.5;
      const middleDistance = distanceFromTerrain(middle);
      if (nearDistance * middleDistance <= 0) {
        far = middle;
      } else {
        near = middle;
        nearDistance = middleDistance;
      }
    }
    ray.at((near + far) * 0.5, point);
  } else {
    const directionY = Math.min(ray.direction.y, -0.0001);
    const fallbackY = TERRAIN_MESH_CONFIG.position[1] + centerOffset;
    ray.at((fallbackY - ray.origin.y) / directionY, point);
  }

  return {
    position: [point.x, point.z],
    distance: ray.origin.distanceTo(point),
  };
}

export function projectOverviewSlotAtDistance(
  screenPosition: readonly [number, number],
  width: number,
  height: number,
  distance: number,
) {
  const camera = makeCamera(width, height, 'overview');
  const rayEnd = new Vector3(...screenPosition, 0.5).unproject(camera);
  const ray = new Ray(camera.position, rayEnd.sub(camera.position).normalize());
  return ray.at(distance, new Vector3()).toArray();
}

/** Like projectOverviewSlotAtDistance, at the depth where `worldWidth` spans `pixelWidth` on screen. */
export function projectOverviewSlotAtScreenWidth(
  screenPosition: readonly [number, number],
  width: number,
  height: number,
  worldWidth: number,
  pixelWidth: number,
) {
  const camera = makeCamera(width, height, 'overview');
  const depth = worldWidth * height
    / (2 * Math.tan(MathUtils.degToRad(camera.fov) * 0.5) * Math.max(pixelWidth, 1));
  const direction = new Vector3(...screenPosition, 0.5).unproject(camera).sub(camera.position).normalize();
  const cosine = direction.dot(camera.getWorldDirection(new Vector3()));
  return projectOverviewSlotAtDistance(screenPosition, width, height, depth / cosine);
}

function normalizeDepth(
  links: readonly SceneLink[],
  slots: Vector2[],
  camera: PerspectiveCamera,
  heightGrid: HeightGrid,
  elevation: number,
  seaLevel: number,
) {
  const projected = links.map((link, index) => (
    projectSlot(
      slots[index],
      camera,
      link.focusedBottomOffset + getSceneLinkHeight(link) * 0.5,
      heightGrid,
      elevation,
      seaLevel,
    )
  ));
  const depths = projected.map(({distance}) => distance).sort((a, b) => a - b);
  const targetDepth = depths[Math.floor((depths.length - 1) * 0.5)];

  return projected.map((initial, index) => {
    if (initial.distance <= targetDepth) return initial.position;

    let closest = initial;
    for (let step = 1; step <= DEPTH_SEARCH_STEPS; step++) {
      const progress = step / DEPTH_SEARCH_STEPS;
      const slot = slots[index].clone();
      slot.y += (SCENE_LINK_LAYOUT.focused.closestSearchY - slot.y) * progress;
      const candidate = projectSlot(
        slot,
        camera,
        links[index].focusedBottomOffset + getSceneLinkHeight(links[index]) * 0.5,
        heightGrid,
        elevation,
        seaLevel,
      );
      if (Math.abs(candidate.distance - targetDepth) < Math.abs(closest.distance - targetDepth)) {
        closest = candidate;
      }
    }
    return closest.position;
  });
}

function makeLayout(
  links: readonly SceneLink[],
  width: number,
  height: number,
  mode: DesktopMode,
  heightGrid: HeightGrid,
  elevation: number,
  seaLevel: number,
  mobileSettings: MobileSceneLinkSettings,
  focusedSectionId: SectionId | null,
) {
  const camera = makeCamera(width, height, mode, focusedSectionId);
  const slots = mode === 'focused'
    ? makeFocusedSlots(links)
    : makeOverviewSlots(links, width, mobileSettings);
  if (mode === 'focused') {
    return normalizeDepth(links, slots, camera, heightGrid, elevation, seaLevel);
  }
  const isMobileOverview = width < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  return links.map((link, index) => {
    const projected = projectSlot(
      slots[index],
      camera,
      (isMobileOverview ? 0 : link.focusedBottomOffset)
        + getSceneLinkHeight(link) * 0.5,
      heightGrid,
      elevation,
      seaLevel,
    );
    return isMobileOverview
      ? pushAwayFromCamera(
        projected.position,
        camera,
        mobileSettings.mobileDepthOffset,
      )
      : projected.position;
  });
}

export function getSceneLinkLayouts(
  links: readonly SceneLink[],
  width: number,
  height: number,
  heightGrid: HeightGrid,
  elevation: number,
  seaLevel: number,
  mobileSettings: MobileSceneLinkSettings = MOBILE_SCENE_LINK_CONFIG,
  focusedSectionId: SectionId | null = null,
) {
  const overview = makeLayout(
    links, width, height, 'overview', heightGrid, elevation, seaLevel,
    mobileSettings, null,
  );
  return {
    overview,
    focused: width < SCENE_LAYOUT_CONFIG.mobileMaxWidth
      ? overview
      : makeLayout(
        links, width, height, 'focused', heightGrid, elevation, seaLevel,
        mobileSettings, focusedSectionId,
      ),
  };
}
