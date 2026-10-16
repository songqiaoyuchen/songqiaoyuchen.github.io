// Photo viewer geometry (components/places/PhotoViewer.tsx): a gallery's photos in one row, the current one full size
// in the middle and the others smaller and dimmer to either side. Settled rows are interpolated for a fractional
// position, so one value drives the whole track. Pure and node-loadable (scripts/test/test-photo-track.mjs), hence
// the relative .ts import.
import {PHOTO_VIEWER_CONFIG} from '../../config/places/photoViewer.ts';

export type FrameSize = {width: number; height: number};
/** A photo's centre from the stage's (px), its scale of the frame size, and its opacity. */
export type PhotoPose = {x: number; scale: number; opacity: number};

const {frame, neighborScale, opacity, gap} = PHOTO_VIEWER_CONFIG;

/** Largest frame a photo may fill on the stage, keeping its aspect ratio. */
export function photoFrame(photo: FrameSize, stage: FrameSize, narrow: boolean): FrameSize {
  const limit = narrow ? frame.narrow : frame.wide;
  const ratio = photo.width / photo.height;
  const width = Math.min(stage.width * limit.width, stage.height * limit.height * ratio);
  return {width, height: width / ratio};
}

/** Centre-to-centre distance (px) from settled photo `current` to the next one in `direction` (±1). */
export function stepDistance(sizes: readonly FrameSize[], current: number, direction: number) {
  const next = sizes[current + direction] ?? sizes[current - direction] ?? sizes[current];
  return (sizes[current].width + next.width * neighborScale) / 2 + gap;
}

// The settled row with photo `current` in the middle.
function settled(sizes: readonly FrameSize[], current: number): PhotoPose[] {
  const scale = (photo: number) => (photo === current ? 1 : neighborScale);
  const half = (photo: number) => (sizes[photo].width * scale(photo)) / 2;
  const x = sizes.map(() => 0);
  for (let photo = current + 1; photo < sizes.length; photo++) {
    x[photo] = x[photo - 1] + half(photo - 1) + gap + half(photo);
  }
  for (let photo = current - 1; photo >= 0; photo--) {
    x[photo] = x[photo + 1] - half(photo + 1) - gap - half(photo);
  }
  return sizes.map((_, photo) => ({
    x: x[photo],
    scale: scale(photo),
    opacity: opacity[Math.min(Math.abs(photo - current), opacity.length - 1)],
  }));
}

/** Every photo's pose at a fractional `position`; past either end the row slides on at the end photo's step. */
export function photoTrackLayout(sizes: readonly FrameSize[], position: number): PhotoPose[] {
  const last = sizes.length - 1;
  const inside = Math.min(Math.max(position, 0), last);
  const base = Math.floor(inside);
  const t = inside - base;
  const from = settled(sizes, base);
  const to = t ? settled(sizes, base + 1) : from;
  const beyond = position - inside;
  const pull = beyond ? beyond * stepDistance(sizes, base, Math.sign(beyond)) : 0;
  return from.map((a, photo) => {
    const b = to[photo];
    return {
      x: a.x + (b.x - a.x) * t - pull,
      scale: a.scale + (b.scale - a.scale) * t,
      opacity: a.opacity + (b.opacity - a.opacity) * t,
    };
  });
}
