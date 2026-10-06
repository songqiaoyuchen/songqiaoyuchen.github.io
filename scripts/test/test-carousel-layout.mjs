// Checks carousel settled poses, wrapping and continuous rotation (lib/art/carouselLayout.ts).
import assert from 'node:assert/strict';
import {CAROUSEL_CONFIG} from '../../config/art/carousel.ts';
import {carouselLayout, loopOffset} from '../../lib/art/carouselLayout.ts';

const {neighborOpacity: NEIGHBOR_OPACITY, neighborScale: NEIGHBOR_SCALE} = CAROUSEL_CONFIG;

const sizes = [
  {width: 600, height: 400}, {width: 300, height: 400}, {width: 500, height: 280},
  {width: 400, height: 400}, {width: 640, height: 360}, {width: 280, height: 420},
];
const near = (a, b, message) => assert(Math.abs(a - b) < 1e-6, `${message}: ${a} vs ${b}`);

assert.equal(loopOffset(5, 6), -1, 'Wrapping takes the short way round');
assert.equal(loopOffset(-4, 6), 2);

// Settled positions reproduce the discrete layout.
for (const vertical of [false, true]) {
  for (let selected = 0; selected < sizes.length; selected++) {
    const {slides, centerHeight} = carouselLayout(sizes, selected + 12, vertical);
    near(centerHeight, sizes[selected].height, 'Center frame height');
    slides.forEach((pose, slide) => {
      const offset = loopOffset(slide - selected, sizes.length);
      near(pose.offset, offset, 'Offset');
      assert.equal(pose.front, offset === 0);
      near(pose.opacity, offset === 0 ? 1 : Math.abs(offset) === 1 ? NEIGHBOR_OPACITY : 0, 'Opacity');
      if (offset === 0) near(pose.width, sizes[slide].width, 'Selected frame keeps natural size');
      // Neighbours recede: never larger than the scaled selected frame across the carousel.
      const cross = vertical ? 'width' : 'height';
      if (offset !== 0) assert(pose[cross] <= sizes[selected][cross] * NEIGHBOR_SCALE + 1e-6, 'Neighbour recedes');
    });
  }
}

// The rotation is continuous: no visible slide jumps between nearby positions,
// and slides only wrap while fully transparent.
for (const vertical of [false, true]) {
  let previous = carouselLayout(sizes, -6, vertical).slides;
  for (let position = -6 + .001; position <= 6; position += .001) {
    const {slides} = carouselLayout(sizes, position, vertical);
    slides.forEach((pose, slide) => {
      const before = previous[slide];
      if (Math.abs(pose.offset - before.offset) > 1) {
        assert(pose.opacity < 1e-6 && before.opacity < 1e-6, 'Only hidden slides wrap');
        return;
      }
      assert(Math.abs(pose.shift - before.shift) < 2, `Shift is continuous at ${position}`);
      assert(Math.abs(pose.width - before.width) < 2, `Width is continuous at ${position}`);
      assert(Math.abs(pose.opacity - before.opacity) < .01, `Opacity is continuous at ${position}`);
    });
    previous = slides;
  }
}
console.log('Carousel layout: settled poses, short-way wrapping, continuous rotation passed.');
