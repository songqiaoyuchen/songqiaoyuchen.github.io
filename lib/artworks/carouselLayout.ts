export type FrameSize = {width: number; height: number};
export type SlidePose = FrameSize & {offset: number; shift: number; opacity: number; front: boolean};

/** Neighbours recede so the selected work clearly dominates, even beside same-sized works. */
export const NEIGHBOR_SCALE = 0.8;
export const NEIGHBOR_OPACITY = 0.42;

const wrap = (value: number, count: number) => ((value % count) + count) % count;

/** Signed distance on a loop of `count` slides, in [-count / 2, count / 2). */
export function loopOffset(value: number, count: number) {
  return wrap(value + count / 2, count) - count / 2;
}

// The settled layout for a slide `offset` places from the selected artwork.
function settledPose(sizes: FrameSize[], slide: number, offset: number, vertical: boolean) {
  const center = sizes[wrap(slide - offset, sizes.length)];
  const natural = sizes[slide];
  const cross = vertical ? 'width' : 'height';
  const scale = offset === 0 || !natural[cross]
    ? 1
    : Math.min(1, center[cross] / natural[cross]) * NEIGHBOR_SCALE;
  const width = natural.width * scale;
  const height = natural.height * scale;
  const along = vertical ? height : width;
  return {
    width,
    height,
    shift: offset * ((vertical ? center.height : center.width) / 2 + along * 0.4 + 20),
    opacity: offset === 0 ? 1 : Math.abs(offset) === 1 ? NEIGHBOR_OPACITY : 0,
  };
}

/**
 * Interpolate between settled layouts at a fractional carousel position, so one
 * continuous value drives the whole rotation. Slides wrap only at the far
 * edge, where they are fully transparent.
 */
export function carouselLayout(sizes: FrameSize[], position: number, vertical: boolean) {
  const base = Math.floor(position);
  const t = position - base;
  const centerHeight = sizes[wrap(base, sizes.length)].height * (1 - t)
    + sizes[wrap(base + 1, sizes.length)].height * t;
  const slides = sizes.map((_, slide): SlidePose => {
    const offset = loopOffset(slide - position, sizes.length);
    const near = Math.floor(offset);
    const f = offset - near;
    const a = settledPose(sizes, slide, near, vertical);
    const b = settledPose(sizes, slide, near + 1, vertical);
    const mix = (key: keyof typeof a) => a[key] + (b[key] - a[key]) * f;
    return {offset, front: Math.abs(offset) < 0.5,
      width: mix('width'), height: mix('height'), shift: mix('shift'), opacity: mix('opacity')};
  });
  return {centerHeight, slides};
}
