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
console.log('Medium transitions: retained outgoing style, halfway state, rapid input, reduced motion, frame clamp passed.');
