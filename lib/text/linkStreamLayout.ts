import {PerspectiveCamera, Ray, Vector2, Vector3} from 'three';
import {
  LINK_STREAM_LAYOUT,
  type LinkStream,
} from '@/config/navigation/linkStreams';
import {
  CAMERA_CONFIG,
  SCENE_LAYOUT_CONFIG,
  TERRAIN_MESH_CONFIG,
} from '@/config/scene';
import type {HeightGrid} from '@/lib/terrain/bake';
import {sampleHeight} from '@/lib/terrain/height';
import {getHomeFov} from '@/lib/scene/camera';
import {getLinkStreamHeight} from './linkStreamGeometry';

export type LinkLayoutMode = 'overview' | 'focused-mobile' | 'focused';

type DesktopMode = Extract<LinkLayoutMode, 'overview' | 'focused'>;
type LayoutPosition = [number, number];

interface ProjectedPosition {
  position: LayoutPosition;
  distance: number;
}

const DEPTH_SEARCH_STEPS = 12;
const INTERSECTION_STEPS = 18;
const INTERSECTION_DISTANCE = 50;

export function getLinkLayoutMode(isFocused: boolean, width: number): LinkLayoutMode {
  if (!isFocused) return 'overview';
  if (width < SCENE_LAYOUT_CONFIG.mobileMaxWidth) return 'focused-mobile';
  return 'focused';
}

function makeSideSlots(side: -1 | 1, streams: readonly LinkStream[]) {
  return streams.map((stream, index) => {
    const count = streams.length;
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const {innerX, outerX, centerY} = LINK_STREAM_LAYOUT.overview;
    const x = innerX + (outerX - innerX) * progress;
    return new Vector2(side * x, centerY + stream.overviewYOffset);
  });
}

function makeOverviewSlots(streams: readonly LinkStream[]) {
  const leftCount = Math.ceil(streams.length / 2);
  return [
    ...makeSideSlots(-1, streams.slice(0, leftCount)),
    ...makeSideSlots(1, streams.slice(leftCount)),
  ];
}

function makeFocusedSlots(count: number) {
  return Array.from({length: count}, (_, index) => {
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const {startX, endX, centerY} = LINK_STREAM_LAYOUT.focused;
    const x = startX + (endX - startX) * progress;
    return new Vector2(x, centerY);
  });
}

function makeCamera(width: number, height: number, mode: DesktopMode) {
  const position = mode === 'focused'
    ? CAMERA_CONFIG.focusedPosition
    : CAMERA_CONFIG.overviewPosition;
  const target = mode === 'focused'
    ? CAMERA_CONFIG.focusedTarget
    : CAMERA_CONFIG.overviewTarget;
  const camera = new PerspectiveCamera(
    getHomeFov(width, height, CAMERA_CONFIG.fov, SCENE_LAYOUT_CONFIG),
    width / Math.max(height, 1),
    0.1,
    100,
  );
  camera.position.fromArray(position);
  camera.lookAt(new Vector3().fromArray(target));
  camera.updateMatrixWorld(true);
  return camera;
}

function projectSlot(
  slot: Vector2,
  camera: PerspectiveCamera,
  stream: LinkStream,
  heightGrid: HeightGrid,
  elevation: number,
  seaLevel: number,
): ProjectedPosition {
  const rayEnd = new Vector3(slot.x, slot.y, 0.5).unproject(camera);
  const ray = new Ray(camera.position, rayEnd.sub(camera.position).normalize());
  const point = new Vector3();
  const centerOffset = stream.bottomOffset + getLinkStreamHeight(stream) * 0.5;

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

function normalizeDepth(
  streams: readonly LinkStream[],
  slots: Vector2[],
  camera: PerspectiveCamera,
  heightGrid: HeightGrid,
  elevation: number,
  seaLevel: number,
) {
  const projected = streams.map((stream, index) => (
    projectSlot(slots[index], camera, stream, heightGrid, elevation, seaLevel)
  ));
  const depths = projected.map(({distance}) => distance).sort((a, b) => a - b);
  const targetDepth = depths[Math.floor((depths.length - 1) * 0.5)];

  return projected.map((initial, index) => {
    if (initial.distance <= targetDepth) return initial.position;

    let closest = initial;
    for (let step = 1; step <= DEPTH_SEARCH_STEPS; step++) {
      const progress = step / DEPTH_SEARCH_STEPS;
      const slot = slots[index].clone();
      slot.y += (LINK_STREAM_LAYOUT.focused.closestSearchY - slot.y) * progress;
      const candidate = projectSlot(
        slot,
        camera,
        streams[index],
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
  streams: readonly LinkStream[],
  width: number,
  height: number,
  mode: DesktopMode,
  heightGrid: HeightGrid,
  elevation: number,
  seaLevel: number,
) {
  const camera = makeCamera(width, height, mode);
  const slots = mode === 'focused'
    ? makeFocusedSlots(streams.length)
    : makeOverviewSlots(streams);
  if (mode === 'focused') {
    return normalizeDepth(streams, slots, camera, heightGrid, elevation, seaLevel);
  }
  return streams.map((stream, index) => (
    projectSlot(slots[index], camera, stream, heightGrid, elevation, seaLevel).position
  ));
}

export function getLinkLayouts(
  streams: readonly LinkStream[],
  width: number,
  height: number,
  heightGrid: HeightGrid,
  elevation: number,
  seaLevel: number,
) {
  return {
    overview: makeLayout(
      streams, width, height, 'overview', heightGrid, elevation, seaLevel,
    ),
    focused: makeLayout(
      streams, width, height, 'focused', heightGrid, elevation, seaLevel,
    ),
  };
}
