import assert from 'node:assert/strict';
import {advanceMediumTransition as advance, settledMedium} from '../lib/terrain/mediumTransition.ts';

let state = advance(settledMedium(2), 1, .016, false, 1.5);
assert.deepEqual(state, {from: 2, to: 1, progress: 0});
for (let frame = 0; frame < 15; frame++) state = advance(state, 1, .05, false, 1.5);
assert(Math.abs(state.progress - .5) < 1e-6);
assert.equal(state.from, 2, 'Outgoing pencil stays present halfway through oil replacement');
state = advance(state, 3, .05, false, 1.5);
assert.equal(state.to, 1, 'Rapid input must not discard either side of an active wipe');
for (let frame = 0; frame < 20 && state.to !== 3; frame++) state = advance(state, 3, .05, false, 1.5);
assert.deepEqual(state, {from: 1, to: 3, progress: 0});
assert.deepEqual(advance(state, 2, .016, true, 1.5), settledMedium(2));
assert(advance(state, 3, 10, false, 1.5).progress < .04, 'Resuming a hidden tab must not jump the wipe');

// Rapid input must never speed up the visible wipe. At 60 fps the old 150 ms
// interruption path jumped 11% per frame instead of the normal 0.56%.
for (const fps of [30, 60, 120]) {
  for (const progress of [0, .1, .5, .9]) {
    state = {from: 3, to: 1, progress};
    let frames = 0;
    while (state.to !== 2 && frames <= fps * 3 + 1) {
      const previous = state;
      state = advance(state, 2, 1 / fps, false, 3);
      frames++;
      if (state.to === 1) {
        assert.equal(state.from, 3, 'Keep the outgoing medium until the interrupted wipe completes');
        assert(Math.abs(state.progress - previous.progress - 1 / fps / 3) < 1e-9,
          'New input must not accelerate the active wipe');
      } else {
        assert(previous.progress + 1 / fps / 3 >= 1 - 1e-9,
          'Only replace the visible pair when the wipe has actually finished');
      }
    }
    assert(frames / fps >= (1 - progress) * 3 - 1e-9, 'Preserve the remaining reveal duration');
    assert.deepEqual(state, {from: 1, to: 2, progress: 0});
  }

  // Cycle through every medium for a second, then stop on pencil. Oil is
  // already arriving; none of the transient selections may start another wipe.
  state = {from: 3, to: 1, progress: .1};
  for (let frame = 0; frame < fps; frame++) {
    const request = [2, 3, 1][Math.floor(frame / Math.max(1, Math.round(fps * .1))) % 3];
    const previous = state;
    state = advance(state, request, 1 / fps, false, 3);
    assert.equal(state.from, 3);
    assert.equal(state.to, 1, 'Burst selections must not flash intermediate media');
    assert(Math.abs(state.progress - previous.progress - 1 / fps / 3) < 1e-9);
  }
  while (state.to === 1) state = advance(state, 2, 1 / fps, false, 3);
  assert.deepEqual(state, {from: 1, to: 2, progress: 0}, 'Only the latest selection follows the active wipe');
  while (state.progress < 1) state = advance(state, 2, 1 / fps, false, 3);
  for (let frame = 0; frame < fps * 3; frame++) state = advance(state, 2, 1 / fps, false, 3);
  assert.equal(state.to, 2, 'Discarded selections must not replay after settling');
}

state = {from: 3, to: 1, progress: .1};
state = advance(state, 2, .05, false, 3);
while (state.to === 1) state = advance(state, 3, .05, false, 3);
assert.equal(state.to, 3, 'Only the latest request should run after an interrupted wipe');
assert.equal(state.from, 1, 'Finish the current replacement before returning to the outgoing medium');
assert.deepEqual(advance(state, 2, .016, true, 3), settledMedium(2));
assert.deepEqual(advance(settledMedium(1), 1, .016, false, 3), settledMedium(1),
  'Selecting another artwork in the current medium must not restart the wipe');
console.log('Medium transitions: constant wipe speed, burst coalescing, latest selection, reduced motion, frame clamp passed.');
