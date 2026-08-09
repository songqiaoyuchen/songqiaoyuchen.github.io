import type {ContourTubeBuffers} from './lineTubeBuffers';

export const CONTOUR_BUFFER_NAMES = [
  'index',
  'lineId',
  'major',
  'normal',
  'position',
  'shadow',
  't',
  'totalLength',
  'travelDirection',
] as const satisfies readonly (keyof ContourTubeBuffers)[];

type ContourBufferName = typeof CONTOUR_BUFFER_NAMES[number];

export type ContourBufferLayout = Record<
  ContourBufferName,
  {byteOffset: number; length: number}
>;

export function packContourTubeBuffers(buffers: ContourTubeBuffers) {
  const layout = {} as ContourBufferLayout;
  let byteLength = 0;
  for (const name of CONTOUR_BUFFER_NAMES) {
    const array = buffers[name];
    layout[name] = {byteOffset: byteLength, length: array.length};
    byteLength += array.byteLength;
  }

  const packed = new Uint8Array(byteLength);
  for (const name of CONTOUR_BUFFER_NAMES) {
    const array = buffers[name];
    packed.set(
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength),
      layout[name].byteOffset,
    );
  }
  return {buffer: packed.buffer, layout};
}

export function unpackContourTubeBuffers(
  buffer: ArrayBuffer,
  layout: ContourBufferLayout,
): ContourTubeBuffers {
  const floatBuffer = (name: Exclude<ContourBufferName, 'index'>) => new Float32Array(
    buffer,
    layout[name].byteOffset,
    layout[name].length,
  );
  return {
    index: new Uint32Array(
      buffer,
      layout.index.byteOffset,
      layout.index.length,
    ),
    lineId: floatBuffer('lineId'),
    major: floatBuffer('major'),
    normal: floatBuffer('normal'),
    position: floatBuffer('position'),
    shadow: floatBuffer('shadow'),
    t: floatBuffer('t'),
    totalLength: floatBuffer('totalLength'),
    travelDirection: floatBuffer('travelDirection'),
  };
}
