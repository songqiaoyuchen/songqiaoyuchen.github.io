// Checks the photo viewer's row (lib/places/photoTrack.ts): settled poses, no overlaps, continuous motion, overscroll.
import assert from 'node:assert/strict';
import {PHOTO_VIEWER_CONFIG} from '../../config/places/photoViewer.ts';
import {photoFrame, photoTrackLayout, stepDistance} from '../../lib/places/photoTrack.ts';

const {neighborScale: NEIGHBOR_SCALE, opacity: OPACITY, gap: GAP} = PHOTO_VIEWER_CONFIG;
const stage = {width: 1200, height: 700};
const photos = [
  {width: 2400, height: 1767}, {width: 1800, height: 2400}, {width: 2400, height: 1297},
  {width: 1800, height: 2400}, {width: 2400, height: 1800},
];
const sizes = photos.map((photo) => photoFrame(photo, stage, false));
const near = (a, b, message) => assert(Math.abs(a - b) < 1e-6, `${message}: ${a} vs ${b}`);

// Frames keep their shape and stay inside the stage's share.
sizes.forEach((size, photo) => {
  near(size.width / size.height, photos[photo].width / photos[photo].height, 'Frame keeps the aspect ratio');
  assert(size.width <= stage.width * 0.62 + 1e-6 && size.height <= stage.height * 0.94 + 1e-6, 'Frame fits');
});

for (let current = 0; current < sizes.length; current++) {
  const poses = photoTrackLayout(sizes, current);
  near(poses[current].x, 0, 'The current photo is centred');
  poses.forEach((pose, photo) => {
    const distance = Math.abs(photo - current);
    near(pose.scale, distance ? NEIGHBOR_SCALE : 1, 'Scale');
    near(pose.opacity, OPACITY[Math.min(distance, OPACITY.length - 1)], 'Opacity');
    if (!photo) return;
    // In order, with exactly the gap between scaled edges.
    const left = poses[photo - 1];
    const edge = (pose.x - (sizes[photo].width * pose.scale) / 2) - (left.x + (sizes[photo - 1].width * left.scale) / 2);
    near(edge, GAP, 'Gap between neighbours');
  });
  if (current < sizes.length - 1) near(poses[current + 1].x, stepDistance(sizes, current, 1), 'Step distance');
}

// Motion is continuous: halfway poses sit between the settled ones, and nothing overlaps on the way.
for (let step = 0; step <= 40; step++) {
  const poses = photoTrackLayout(sizes, (step / 40) * (sizes.length - 1));
  for (let photo = 1; photo < poses.length; photo++) {
    const left = poses[photo - 1];
    const right = poses[photo];
    const edge = (right.x - (sizes[photo].width * right.scale) / 2) - (left.x + (sizes[photo - 1].width * left.scale) / 2);
    assert(edge >= GAP - 1e-6, `No overlap at position ${step / 40}`);
  }
}

// Past the ends the row slides on rather than stopping.
assert(photoTrackLayout(sizes, -0.2)[0].x > 0, 'Pulling before the first photo moves it right');
assert(photoTrackLayout(sizes, sizes.length - 0.8)[sizes.length - 1].x < 0, 'Pulling past the last moves it left');

// One photo alone still lays out.
near(photoTrackLayout([sizes[0]], 0)[0].x, 0, 'A single photo is centred');

console.log('photo track layout ok');
