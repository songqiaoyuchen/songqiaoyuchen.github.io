import { BufferAttribute, BufferGeometry } from 'three';
import type {LinkStream} from '@/config/navigation';

const FIRST_CODEPOINT = 32;
const ATLAS_COLUMNS = 16;
const ATLAS_ROWS = 8;
const X_SEGMENTS = 2;
const Y_SEGMENTS = 4;
const FOCUS_BRACKET_PADDING = 0.08;
const FOCUS_BRACKET_THICKNESS = 0.034;

export interface HorizontalStreamText {
  alternateText?: string;
  anchor: [number, number];
  bottomOffset: number;
  glyphWidthToHeightRatio?: number;
  intensity: number;
  seed: number;
  size: number;
  spacing: number;
  text: string;
}

type GeometryBuffers = {
  alternateUvs: number[];
  atlasUvs: number[];
  billboardOffsets: number[];
  borderFlags: number[];
  indices: number[];
  intensities: number[];
  localUvs: number[];
  navGlyphs: number[];
  positions: number[];
  seeds: number[];
  spacingOffsets: number[];
  streamIndices: number[];
  streamTs: number[];
};

function createStreamGeometry(buffers: GeometryBuffers) {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(buffers.positions), 3),
  );
  geometry.setAttribute(
    'uv',
    new BufferAttribute(new Float32Array(buffers.atlasUvs), 2),
  );
  geometry.setAttribute(
    'aAlternateUv',
    new BufferAttribute(new Float32Array(buffers.alternateUvs), 2),
  );
  geometry.setAttribute(
    'aBillboardOffset',
    new BufferAttribute(new Float32Array(buffers.billboardOffsets), 2),
  );
  geometry.setAttribute(
    'aLocalUv',
    new BufferAttribute(new Float32Array(buffers.localUvs), 2),
  );
  geometry.setAttribute(
    'aStreamIndex',
    new BufferAttribute(new Float32Array(buffers.streamIndices), 1),
  );
  geometry.setAttribute(
    'aNavGlyph',
    new BufferAttribute(new Float32Array(buffers.navGlyphs), 1),
  );
  geometry.setAttribute(
    'aIntensity',
    new BufferAttribute(new Float32Array(buffers.intensities), 1),
  );
  geometry.setAttribute(
    'aSeed',
    new BufferAttribute(new Float32Array(buffers.seeds), 1),
  );
  geometry.setAttribute(
    'aStreamT',
    new BufferAttribute(new Float32Array(buffers.streamTs), 1),
  );
  geometry.setAttribute(
    'aSpacingOffset',
    new BufferAttribute(new Float32Array(buffers.spacingOffsets), 1),
  );
  geometry.setAttribute(
    'aBorder',
    new BufferAttribute(new Float32Array(buffers.borderFlags), 1),
  );
  geometry.setIndex(buffers.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export function getLinkStreamHeight(stream: LinkStream) {
  return stream.size
    + Math.max(0, stream.text.length - 1) * (stream.size + stream.spacing);
}

export function buildHorizontalStreamGeometry(run: HorizontalStreamText) {
  const alternateText = run.alternateText ?? run.text;
  if (alternateText.length !== run.text.length) {
    throw new Error('Horizontal stream alternate text must match the original text length.');
  }

  const buffers: GeometryBuffers = {
    positions: [],
    atlasUvs: [],
    alternateUvs: [],
    billboardOffsets: [],
    localUvs: [],
    streamIndices: [],
    navGlyphs: [],
    intensities: [],
    seeds: [],
    streamTs: [],
    spacingOffsets: [],
    borderFlags: [],
    indices: [],
  };
  const glyphWidth = run.size * (run.glyphWidthToHeightRatio ?? 0.62);
  const advance = glyphWidth + run.spacing;
  const denominator = Math.max(1, run.text.length - 1);

  for (let characterIndex = 0; characterIndex < run.text.length; characterIndex++) {
    const atlasIndex = run.text.charCodeAt(characterIndex) - FIRST_CODEPOINT;
    const column = atlasIndex % ATLAS_COLUMNS;
    const row = Math.floor(atlasIndex / ATLAS_COLUMNS);
    const alternateAtlasIndex = alternateText.charCodeAt(characterIndex) - FIRST_CODEPOINT;
    const alternateColumn = alternateAtlasIndex % ATLAS_COLUMNS;
    const alternateRow = Math.floor(alternateAtlasIndex / ATLAS_COLUMNS);
    const horizontalCenter = (characterIndex - (run.text.length - 1) * 0.5) * advance;
    const verticalCenter = run.bottomOffset + run.size * 0.5;
    const vertexBase = buffers.positions.length / 3;

    for (let iy = 0; iy <= Y_SEGMENTS; iy++) {
      const localY = iy / Y_SEGMENTS;
      for (let ix = 0; ix <= X_SEGMENTS; ix++) {
        const localX = ix / X_SEGMENTS;
        buffers.positions.push(run.anchor[0], verticalCenter, run.anchor[1]);
        buffers.billboardOffsets.push(
          horizontalCenter + (localX - 0.5) * glyphWidth,
          (localY - 0.5) * run.size,
        );
        buffers.atlasUvs.push(
          (column + localX) / ATLAS_COLUMNS,
          1 - (row + 1 - localY) / ATLAS_ROWS,
        );
        buffers.alternateUvs.push(
          (alternateColumn + localX) / ATLAS_COLUMNS,
          1 - (alternateRow + 1 - localY) / ATLAS_ROWS,
        );
        buffers.localUvs.push(localX, localY);
        buffers.streamIndices.push(0);
        buffers.navGlyphs.push(1);
        buffers.intensities.push(run.intensity);
        buffers.seeds.push(run.seed + characterIndex * 0.173);
        buffers.streamTs.push(characterIndex / denominator);
        buffers.spacingOffsets.push(0);
        buffers.borderFlags.push(0);
      }
    }

    const rowStride = X_SEGMENTS + 1;
    for (let iy = 0; iy < Y_SEGMENTS; iy++) {
      for (let ix = 0; ix < X_SEGMENTS; ix++) {
        const a = vertexBase + iy * rowStride + ix;
        const b = a + 1;
        const c = a + rowStride;
        const d = c + 1;
        buffers.indices.push(a, b, c, b, d, c);
      }
    }
  }

  return createStreamGeometry(buffers);
}

export function buildLinkStreamGeometry(streams: readonly LinkStream[]) {
  const positions: number[] = [];
  const atlasUvs: number[] = [];
  const alternateUvs: number[] = [];
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
      alternateUvs.push(0, 0);
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
      const verticalCenter = stream.focusedBottomOffset
        + stream.size * 0.5
        + reversedIndex * advance;
      const vertexBase = positions.length / 3;

      for (let iy = 0; iy <= Y_SEGMENTS; iy++) {
        const localY = iy / Y_SEGMENTS;
        for (let ix = 0; ix <= X_SEGMENTS; ix++) {
          const localX = ix / X_SEGMENTS;
          positions.push(stream.anchor[0], verticalCenter, stream.anchor[1]);
          billboardOffsets.push((localX - 0.5) * glyphWidth, (localY - 0.5) * stream.size);
          atlasUvs.push((column + localX) / ATLAS_COLUMNS, 1 - (row + 1 - localY) / ATLAS_ROWS);
          alternateUvs.push(
            (column + localX) / ATLAS_COLUMNS,
            1 - (row + 1 - localY) / ATLAS_ROWS,
          );
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
    const bracketTop = stream.focusedBottomOffset + streamHeight + FOCUS_BRACKET_PADDING;
    const bracketBottom = stream.focusedBottomOffset - FOCUS_BRACKET_PADDING;

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

  return createStreamGeometry({
    positions,
    atlasUvs,
    alternateUvs,
    billboardOffsets,
    localUvs,
    streamIndices,
    navGlyphs,
    intensities,
    seeds,
    streamTs,
    spacingOffsets,
    borderFlags,
    indices,
  });
}
