import {
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PerspectiveCamera,
  PlaneGeometry,
  Vector3,
} from 'three';
import type { HeightGrid } from '@/lib/terrain/bake';
import {sampleHeight} from '@/lib/terrain/height';

export const DECOR_ATLAS_COLUMNS = 42;

export type DecorStreamBounds = {
  x: readonly [number, number];
  z: readonly [number, number];
};

type DecorStreamInstance = {
  anchor: [number, number];
  charCount: number;
  glyphHeight: number;
  bottomOffset: number;
  density: number;
  random: [number, number, number, number];
  viewDepth: number;
  screenX: number;
};

type LayoutOptions = {
  count: number;
  bounds: DecorStreamBounds;
  seed: number;
  depthLayers: number;
  aspect: number;
  camera: {
    fov: number;
    position: readonly [number, number, number];
    target: readonly [number, number, number];
  };
  heightGrid: HeightGrid;
  elevation: number;
  seaLevel: number;
};

function random01(index: number, salt: number, seed: number) {
  const value = Math.sin((index + seed) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function randomBetween(min: number, max: number, value: number) {
  return min + (max - min) * value;
}

function makeLayoutCamera(options: LayoutOptions['camera'], aspect: number) {
  const camera = new PerspectiveCamera(options.fov, aspect, 0.1, 100);
  camera.position.fromArray(options.position);
  camera.lookAt(new Vector3().fromArray(options.target));
  camera.updateMatrixWorld(true);
  return camera;
}

/**
 * Generates random world-space anchors, then stratifies the accepted anchors
 * in projected X. The source distribution stays random over the terrain, while
 * streams can no longer collapse into camera-space clumps or overlap columns.
 */
export function generateDecorStreamLayers({
  count,
  bounds,
  seed,
  depthLayers,
  aspect,
  camera: cameraOptions,
  heightGrid,
  elevation,
  seaLevel,
}: LayoutOptions): DecorStreamInstance[][] {
  const camera = makeLayoutCamera(cameraOptions, aspect);
  const candidates: DecorStreamInstance[] = [];
  const projected = new Vector3();
  const viewPosition = new Vector3();

  for (let attempt = 0; attempt < count * 160; attempt++) {
    const x = randomBetween(bounds.x[0], bounds.x[1], random01(attempt, 1, seed));
    const z = randomBetween(bounds.z[0], bounds.z[1], random01(attempt, 2, seed));
    const bottomOffset = randomBetween(0.08, 0.68, random01(attempt, 5, seed));
    const y = sampleHeight(heightGrid, x, z, elevation, seaLevel) + bottomOffset;

    projected.set(x, y, z).project(camera);
    viewPosition.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    if (
      projected.z < -1 || projected.z > 1
      || projected.x < -1.02 || projected.x > 1.02
      || projected.y < -0.92 || projected.y > 0.58
    ) continue;

    candidates.push({
      anchor: [x, z],
      charCount: Math.round(randomBetween(22, 42, random01(attempt, 3, seed))),
      glyphHeight: randomBetween(0.078, 0.112, random01(attempt, 4, seed)),
      bottomOffset,
      density: randomBetween(0.28, 0.72, random01(attempt, 6, seed)),
      random: [
        random01(attempt, 7, seed),
        random01(attempt, 8, seed),
        random01(attempt, 9, seed),
        random01(attempt, 10, seed),
      ],
      viewDepth: -viewPosition.z,
      screenX: projected.x,
    });
  }

  // One random target inside each projected band: even visual weight without
  // turning the underlying world-space placement into fixed columns.
  const screenMin = -0.96;
  const screenSpan = 1.92;
  const bandWidth = screenSpan / count;
  const selected: DecorStreamInstance[] = [];
  const remaining = [...candidates];
  for (let index = 0; index < count && remaining.length; index++) {
    const jitter = (random01(index, 11, seed) - 0.5) * bandWidth * 0.42;
    const targetX = screenMin + (index + 0.5) * bandWidth + jitter;
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let candidateIndex = 0; candidateIndex < remaining.length; candidateIndex++) {
      const distance = Math.abs(remaining[candidateIndex].screenX - targetX);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = candidateIndex;
      }
    }
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  // Lusion's four meshes are depth groups. Sorting before splitting makes the
  // progressive blur correspond to actual camera depth instead of an arbitrary
  // instance index.
  selected.sort((a, b) => b.viewDepth - a.viewDepth);
  const layers = Array.from(
    { length: depthLayers },
    () => [] as DecorStreamInstance[],
  );
  selected.forEach((instance, index) => {
    const layer = Math.min(
      depthLayers - 1,
      Math.floor(index * depthLayers / selected.length),
    );
    layers[layer].push(instance);
  });
  return layers;
}

export function buildDecorStreamGeometry(
  instances: DecorStreamInstance[],
): InstancedBufferGeometry {
  const plane = new PlaneGeometry(1, 1);
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(plane.index);
  geometry.setAttribute('position', plane.getAttribute('position'));
  geometry.setAttribute('uv', plane.getAttribute('uv'));

  const anchors = new Float32Array(instances.length * 2);
  const params = new Float32Array(instances.length * 4);
  const randoms = new Float32Array(instances.length * 4);
  instances.forEach((instance, index) => {
    anchors.set(instance.anchor, index * 2);
    params.set([
      instance.charCount,
      instance.glyphHeight,
      instance.bottomOffset,
      instance.density,
    ], index * 4);
    randoms.set(instance.random, index * 4);
  });

  geometry.setAttribute('aAnchor', new InstancedBufferAttribute(anchors, 2));
  geometry.setAttribute('aParams', new InstancedBufferAttribute(params, 4));
  geometry.setAttribute('aRandom', new InstancedBufferAttribute(randoms, 4));
  geometry.instanceCount = instances.length;
  plane.dispose();
  return geometry;
}
