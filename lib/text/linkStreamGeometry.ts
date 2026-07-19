import { BufferAttribute, BufferGeometry } from 'three';

export type LinkStreamRun = {
  text: string;
  anchor: [number, number];
  size: number;
  spacing: number;
  bottomOffset: number;
  linkId: number;
  navRange: [number, number];
  intensity: number;
  seed: number;
};

const FIRST_CODEPOINT = 32;
const ATLAS_COLUMNS = 16;
const ATLAS_ROWS = 8;
const X_SEGMENTS = 2;
const Y_SEGMENTS = 4;

export function linkStreamWorldHeight(run: LinkStreamRun): number {
  return run.size + Math.max(0, run.text.length - 1) * (run.size + run.spacing);
}

export function buildLinkStreamGeometry(runs: LinkStreamRun[]): BufferGeometry {
  const positions: number[] = [];
  const atlasUvs: number[] = [];
  const billboardOffsets: number[] = [];
  const localUvs: number[] = [];
  const linkIds: number[] = [];
  const navGlyphs: number[] = [];
  const intensities: number[] = [];
  const seeds: number[] = [];
  const streamTs: number[] = [];
  const indices: number[] = [];

  for (const run of runs) {
    const advance = run.size + run.spacing;
    const glyphWidth = run.size * 0.62;
    const denominator = Math.max(1, run.text.length - 1);

    for (let characterIndex = 0; characterIndex < run.text.length; characterIndex++) {
      const atlasIndex = run.text.charCodeAt(characterIndex) - FIRST_CODEPOINT;
      const column = atlasIndex % ATLAS_COLUMNS;
      const row = Math.floor(atlasIndex / ATLAS_COLUMNS);
      const reversedIndex = run.text.length - 1 - characterIndex;
      const verticalCenter = run.bottomOffset + run.size * 0.5 + reversedIndex * advance;
      const vertexBase = positions.length / 3;

      for (let iy = 0; iy <= Y_SEGMENTS; iy++) {
        const localY = iy / Y_SEGMENTS;
        for (let ix = 0; ix <= X_SEGMENTS; ix++) {
          const localX = ix / X_SEGMENTS;
          positions.push(run.anchor[0], verticalCenter, run.anchor[1]);
          billboardOffsets.push((localX - 0.5) * glyphWidth, (localY - 0.5) * run.size);
          atlasUvs.push((column + localX) / ATLAS_COLUMNS, 1 - (row + 1 - localY) / ATLAS_ROWS);
          localUvs.push(localX, localY);
          linkIds.push(run.linkId);
          navGlyphs.push(characterIndex >= run.navRange[0] && characterIndex < run.navRange[1] ? 1 : 0);
          intensities.push(run.intensity);
          seeds.push(run.seed + characterIndex * 0.173);
          streamTs.push(reversedIndex / denominator);
        }
      }

      const rowStride = X_SEGMENTS + 1;
      for (let iy = 0; iy < Y_SEGMENTS; iy++) {
        for (let ix = 0; ix < X_SEGMENTS; ix++) {
          const a = vertexBase + iy * rowStride + ix;
          const b = a + 1;
          const c = a + rowStride;
          const d = c + 1;
          indices.push(a, b, c, b, d, c);
        }
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(atlasUvs), 2));
  geometry.setAttribute('aBillboardOffset', new BufferAttribute(new Float32Array(billboardOffsets), 2));
  geometry.setAttribute('aLocalUv', new BufferAttribute(new Float32Array(localUvs), 2));
  geometry.setAttribute('aLinkId', new BufferAttribute(new Float32Array(linkIds), 1));
  geometry.setAttribute('aNavGlyph', new BufferAttribute(new Float32Array(navGlyphs), 1));
  geometry.setAttribute('aIntensity', new BufferAttribute(new Float32Array(intensities), 1));
  geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));
  geometry.setAttribute('aStreamT', new BufferAttribute(new Float32Array(streamTs), 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
