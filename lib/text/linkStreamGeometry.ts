import { BufferAttribute, BufferGeometry } from 'three';
import type {LinkStream} from '@/config/navigation';

const FIRST_CODEPOINT = 32;
const ATLAS_COLUMNS = 16;
const ATLAS_ROWS = 8;
const X_SEGMENTS = 2;
const Y_SEGMENTS = 4;

export function getLinkStreamHeight(stream: LinkStream) {
  return stream.size
    + Math.max(0, stream.text.length - 1) * (stream.size + stream.spacing);
}

export function buildLinkStreamGeometry(streams: readonly LinkStream[]) {
  const positions: number[] = [];
  const atlasUvs: number[] = [];
  const billboardOffsets: number[] = [];
  const localUvs: number[] = [];
  const streamIndices: number[] = [];
  const navGlyphs: number[] = [];
  const intensities: number[] = [];
  const seeds: number[] = [];
  const streamTs: number[] = [];
  const indices: number[] = [];

  for (const stream of streams) {
    const advance = stream.size + stream.spacing;
    const glyphWidth = stream.size * 0.62;
    const denominator = Math.max(1, stream.text.length - 1);

    for (let characterIndex = 0; characterIndex < stream.text.length; characterIndex++) {
      const atlasIndex = stream.text.charCodeAt(characterIndex) - FIRST_CODEPOINT;
      const column = atlasIndex % ATLAS_COLUMNS;
      const row = Math.floor(atlasIndex / ATLAS_COLUMNS);
      const reversedIndex = stream.text.length - 1 - characterIndex;
      const verticalCenter = stream.bottomOffset + stream.size * 0.5 + reversedIndex * advance;
      const vertexBase = positions.length / 3;

      for (let iy = 0; iy <= Y_SEGMENTS; iy++) {
        const localY = iy / Y_SEGMENTS;
        for (let ix = 0; ix <= X_SEGMENTS; ix++) {
          const localX = ix / X_SEGMENTS;
          positions.push(stream.anchor[0], verticalCenter, stream.anchor[1]);
          billboardOffsets.push((localX - 0.5) * glyphWidth, (localY - 0.5) * stream.size);
          atlasUvs.push((column + localX) / ATLAS_COLUMNS, 1 - (row + 1 - localY) / ATLAS_ROWS);
          localUvs.push(localX, localY);
          streamIndices.push(stream.index);
          navGlyphs.push(
            characterIndex >= stream.navRange[0] && characterIndex < stream.navRange[1]
              ? 1
              : 0,
          );
          intensities.push(stream.intensity);
          seeds.push(stream.seed + characterIndex * 0.173);
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
  geometry.setAttribute(
    'aBillboardOffset',
    new BufferAttribute(new Float32Array(billboardOffsets), 2),
  );
  geometry.setAttribute('aLocalUv', new BufferAttribute(new Float32Array(localUvs), 2));
  geometry.setAttribute(
    'aStreamIndex',
    new BufferAttribute(new Float32Array(streamIndices), 1),
  );
  geometry.setAttribute('aNavGlyph', new BufferAttribute(new Float32Array(navGlyphs), 1));
  geometry.setAttribute('aIntensity', new BufferAttribute(new Float32Array(intensities), 1));
  geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));
  geometry.setAttribute('aStreamT', new BufferAttribute(new Float32Array(streamTs), 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
