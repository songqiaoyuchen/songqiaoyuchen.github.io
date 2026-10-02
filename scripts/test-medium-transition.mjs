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

// Selecting pencil just after oil starts must not wait out the three-second reveal.
for (const fps of [30, 60, 120]) {
  for (const progress of [0, .1, .5, .9]) {
    state = {from: 3, to: 1, progress};
    let frames = 0;
    while (state.to !== 2 && frames <= fps) {
      const previous = state;
      state = advance(state, 2, 1 / fps, false, 3);
      frames++;
      if (state.to === 1) {
        assert.equal(state.from, 3, 'Keep the outgoing medium until the interrupted wipe completes');
        assert(state.progress > previous.progress, 'The interrupted wipe must keep moving');
      }
    }
    assert(frames / fps <= .15 + 1 / fps, 'New medium must start within 150 ms plus one frame');
    assert.deepEqual(state, {from: 1, to: 2, progress: 0});
  }
}

state = {from: 3, to: 1, progress: .1};
state = advance(state, 2, .05, false, 3);
while (state.to === 1) state = advance(state, 3, .05, false, 3);
assert.equal(state.to, 3, 'Only the latest request should run after an interrupted wipe');
assert.equal(state.from, 1, 'Finish the current replacement before returning to the outgoing medium');
assert.deepEqual(advance(state, 2, .016, true, 3), settledMedium(2));
console.log('Medium transitions: continuity, bounded input latency, latest selection, reduced motion, frame clamp passed.');
