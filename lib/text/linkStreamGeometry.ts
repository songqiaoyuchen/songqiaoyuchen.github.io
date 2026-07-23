import { BufferAttribute, BufferGeometry } from 'three';
import type {LinkStream} from '@/config/navigation';

const FIRST_CODEPOINT = 32;
const ATLAS_COLUMNS = 16;
const ATLAS_ROWS = 8;
const X_SEGMENTS = 2;
const Y_SEGMENTS = 4;
const FOCUS_BRACKET_PADDING = 0.08;
const FOCUS_BRACKET_THICKNESS = 0.034;

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
  const spacingOffsets: number[] = [];
  const borderFlags: number[] = [];
  const indices: number[] = [];

  function pushFocusBracketQuad(
    stream: LinkStream,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    seed: number,
  ) {
    const vertexBase = positions.length / 3;
    const corners = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ];

    for (const [cornerX, cornerY] of corners) {
      positions.push(stream.anchor[0], centerY, stream.anchor[1]);
      billboardOffsets.push(centerX + cornerX * width, cornerY * height);
      atlasUvs.push(0, 0);
      localUvs.push(cornerX + 0.5, cornerY + 0.5);
      streamIndices.push(stream.index);
      navGlyphs.push(1);
      intensities.push(stream.intensity);
      seeds.push(seed);
      streamTs.push(cornerY + 0.5);
      spacingOffsets.push(0);
      borderFlags.push(1);
    }

    indices.push(
      vertexBase,
      vertexBase + 1,
      vertexBase + 2,
      vertexBase + 1,
      vertexBase + 3,
      vertexBase + 2,
    );
  }

  function pushFocusBracketPair(
    stream: LinkStream,
    horizontalCenterX: number,
    horizontalCenterY: number,
    verticalCenterX: number,
    verticalCenterY: number,
    armWidth: number,
    armHeight: number,
    seed: number,
  ) {
    pushFocusBracketQuad(
      stream,
      horizontalCenterX,
      horizontalCenterY,
      armWidth,
      FOCUS_BRACKET_THICKNESS,
      seed,
    );
    pushFocusBracketQuad(
      stream,
      verticalCenterX,
      verticalCenterY,
      FOCUS_BRACKET_THICKNESS,
      armHeight,
      seed + 0.1,
    );
  }

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
          spacingOffsets.push(reversedIndex * stream.spacing);
          borderFlags.push(0);
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

    const streamHeight = getLinkStreamHeight(stream);
    const bracketArm = Math.min(stream.size * 0.48, 0.22);
    const bracketX = glyphWidth * 0.5 + FOCUS_BRACKET_PADDING;
    const bracketTop = stream.bottomOffset + streamHeight + FOCUS_BRACKET_PADDING;
    const bracketBottom = stream.bottomOffset - FOCUS_BRACKET_PADDING;

    pushFocusBracketPair(
      stream,
      -bracketX + bracketArm * 0.5,
      bracketTop,
      -bracketX,
      bracketTop - bracketArm * 0.5,
      bracketArm,
      bracketArm,
      stream.seed + 31.1,
    );
    pushFocusBracketPair(
      stream,
      bracketX - bracketArm * 0.5,
      bracketBottom,
      bracketX,
      bracketBottom + bracketArm * 0.5,
      bracketArm,
      bracketArm,
      stream.seed + 31.3,
    );
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
  geometry.setAttribute(
    'aSpacingOffset',
    new BufferAttribute(new Float32Array(spacingOffsets), 1),
  );
  geometry.setAttribute('aBorder', new BufferAttribute(new Float32Array(borderFlags), 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
