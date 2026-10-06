// Per-frame scene link maths for SceneLinks: layout easing, hover/glitch decay and hit-target sizing.
import {Vector3, type Camera} from 'three';
import {SCENE_LINK_EFFECT_CONFIG, SCENE_LINKS, type SceneLink} from '@/config/scene';
import type {HeightGrid} from '@/lib/terrain/bake';
import {sampleHeight} from '@/lib/terrain/height';
import {getSceneLinkHeight} from '@/lib/text/sceneLinkGeometry';

export const SETTLE_EPSILON = 0.0001;

type LayoutTarget = readonly (readonly [number, number])[] | undefined;
type LayoutMode = {isOverview: boolean; isMobileOverview: boolean};

/**
 * Ease every link's layout offset toward its target slot by `alpha` (1 = jump).
 * Returns whether any link is still moving, and whether any offset changed.
 */
export function advanceLinkLayout(
  offsetX: Float32Array,
  offsetZ: Float32Array,
  verticalOffsets: Float32Array,
  targetLayout: LayoutTarget,
  alpha: number,
  {isOverview, isMobileOverview}: LayoutMode,
) {
  let unsettled = false;
  let moved = false;
  for (const link of SCENE_LINKS) {
    const target = targetLayout?.[link.index] ?? link.anchor;
    const targetOffsetX = target[0] - link.anchor[0];
    const targetOffsetZ = target[1] - link.anchor[1];
    const previousOffsetX = offsetX[link.index];
    const previousOffsetZ = offsetZ[link.index];
    const nextOffsetX = previousOffsetX
      + (targetOffsetX - previousOffsetX) * alpha;
    const nextOffsetZ = previousOffsetZ
      + (targetOffsetZ - previousOffsetZ) * alpha;
    const xSettled = Math.abs(targetOffsetX - nextOffsetX) < SETTLE_EPSILON;
    const zSettled = Math.abs(targetOffsetZ - nextOffsetZ) < SETTLE_EPSILON;
    offsetX[link.index] = xSettled ? targetOffsetX : nextOffsetX;
    offsetZ[link.index] = zSettled ? targetOffsetZ : nextOffsetZ;
    unsettled ||= !xSettled || !zSettled;
    moved ||= (
      previousOffsetX !== offsetX[link.index]
      || previousOffsetZ !== offsetZ[link.index]
    );
    verticalOffsets[link.index] = isMobileOverview
      ? -link.focusedBottomOffset
      : isOverview
        ? link.overviewBottomOffset - link.focusedBottomOffset
        : 0;
  }
  return {unsettled, moved};
}

/** Ease hover toward the hovered link and decay letter-swap glitches. Returns whether anything still moves. */
export function advanceLinkInteraction(
  hover: Float32Array,
  glitch: Float32Array,
  hoveredIndex: number | null,
  visible: boolean,
  delta: number,
) {
  const hoverAlpha = Math.min(1, delta * SCENE_LINK_EFFECT_CONFIG.hoverDamping);
  let unsettled = false;

  for (let index = 0; index < SCENE_LINKS.length; index++) {
    const hoverTarget = visible && hoveredIndex === index ? 1 : 0;
    const nextHover = hover[index]
      + (hoverTarget - hover[index]) * hoverAlpha;
    const hoverSettled = Math.abs(hoverTarget - nextHover) < SETTLE_EPSILON;
    hover[index] = hoverSettled ? hoverTarget : nextHover;

    const nextGlitch = Math.max(
      0,
      glitch[index]
        - delta / SCENE_LINK_EFFECT_CONFIG.letterSwapDuration,
    );
    const glitchSettled = nextGlitch === 0;
    glitch[index] = glitchSettled ? 0 : nextGlitch;
    unsettled ||= !hoverSettled || !glitchSettled;
  }
  return unsettled;
}

/** Scratch vectors for hit-target projection, reused every frame. */
export function createHitProjection() {
  return {
    bottom: new Vector3(),
    center: new Vector3(),
    left: new Vector3(),
    right: new Vector3(),
    rightAxis: new Vector3(),
    top: new Vector3(),
    toCamera: new Vector3(),
    up: new Vector3(0, 1, 0),
  };
}

type Terrain = {shellBase: HeightGrid; elevation: number; seaLevel: number};

/**
 * World centre of a link's invisible HTML button, and its on-screen size in CSS px
 * (at least the 44px touch target), from the link's projected glyph column.
 */
export function measureHitTarget(
  link: SceneLink,
  x: number,
  z: number,
  {isOverview, isMobileOverview}: LayoutMode,
  {shellBase, elevation, seaLevel}: Terrain,
  camera: Camera,
  projection: ReturnType<typeof createHitProjection>,
  viewport: {width: number; height: number},
) {
  const linkHeight = getSceneLinkHeight(link);
  const y =
    sampleHeight(shellBase, x, z, elevation, seaLevel) +
    (isMobileOverview
      ? 0
      : isOverview
        ? link.overviewBottomOffset
      : link.focusedBottomOffset) +
    linkHeight * 0.5;

  const halfWidth = link.size * 0.62 * 0.5;
  projection.center.set(x, y, z);
  projection.toCamera.subVectors(camera.position, projection.center).normalize();
  projection.rightAxis.crossVectors(projection.up, projection.toCamera).normalize();
  projection.top.set(x, y + linkHeight * 0.5, z).project(camera);
  projection.bottom.set(x, y - linkHeight * 0.5, z).project(camera);
  projection.left.copy(projection.center)
    .addScaledVector(projection.rightAxis, -halfWidth)
    .project(camera);
  projection.right.copy(projection.center)
    .addScaledVector(projection.rightAxis, halfWidth)
    .project(camera);

  const height = Math.max(
    44,
    Math.abs(projection.top.y - projection.bottom.y) * viewport.height * 0.5 + 16,
  );
  const width = Math.max(
    44,
    Math.abs(projection.right.x - projection.left.x) * viewport.width * 0.5 + 16,
  );
  return {y, width, height};
}
