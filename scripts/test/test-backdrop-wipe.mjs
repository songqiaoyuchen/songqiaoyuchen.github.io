// Checks backdrop wipe continuity and rapid selection behaviour (lib/art/backdropWipe.ts).
import assert from 'node:assert/strict';
import {advanceBackdropWipe as advance, settledBackdrop} from '../../lib/art/backdropWipe.ts';

const near = (a, b) => Math.abs(a - b) < 1e-9;

let state = advance(settledBackdrop(2), 1, .016, false, 1.5);
assert.deepEqual(state, {from: 2, to: 1, progress: 0});
for (let frame = 0; frame < 15; frame++) state = advance(state, 1, .05, false, 1.5);
assert(Math.abs(state.progress - .5) < 1e-6);
assert.equal(state.from, 2, 'Outgoing pencil stays present halfway through oil replacement');
assert.deepEqual(advance(state, 2, .016, true, 1.5), settledBackdrop(2), 'Reduced motion settles at once');
assert(advance(state, 1, 10, false, 1.5).progress < .54, 'Resuming a hidden tab must not jump the wipe');
assert.deepEqual(advance(settledBackdrop(1), 1, .016, false, 3), settledBackdrop(1),
  'Selecting another artwork in the current medium must not restart the wipe');

// The visible pair never changes mid-wipe: only the front moves, forward, back, or (for a third medium) the short
// way at the catch-up pace, after which the latest request starts.
for (const fps of [30, 60, 120]) {
  const dt = 1 / fps;
  const duration = 3;
  const catchUp = .5;
  // Undo: a request for the outgoing medium runs the front back up at the normal speed and settles on it.
  state = {from: 3, to: 1, progress: .6};
  let frames = 0;
  while (state.from !== state.to) {
    const previous = state;
    state = advance(state, 3, dt, false, duration, catchUp);
    frames++;
    if (state.from !== state.to) {
      assert.equal(state.from, 3);
      assert.equal(state.to, 1, 'Reversing keeps the visible pair');
      assert(near(previous.progress - state.progress, dt / duration), 'Reversing runs at the normal speed');
    }
  }
  assert.deepEqual(state, settledBackdrop(3), 'Reversed all the way, the outgoing medium rests');
  assert(Math.abs(frames * dt - .6 * duration) <= dt + 1e-9, 'Reversing takes the way already come');

  // A third medium: the wipe under way resolves the short way, within the catch-up time, then the new one starts.
  for (const progress of [.05, .3, .5, .7, .95]) {
    state = {from: 3, to: 1, progress};
    frames = 0;
    const back = progress <= .5;
    while (state.to !== 2 && frames < fps * 5) {
      const previous = state;
      state = advance(state, 2, dt, false, duration, catchUp);
      frames++;
      if (state.to === 1) {
        assert.equal(state.from, 3, 'Resolving keeps the visible pair');
        assert(back ? state.progress < previous.progress : state.progress > previous.progress, 'Resolves the short way');
      }
    }
    assert.deepEqual(state, {from: back ? 3 : 1, to: 2, progress: 0}, 'The latest request starts from the resolved side');
    const remaining = back ? progress : 1 - progress;
    assert(frames * dt <= remaining * catchUp + dt + 1e-9, 'Resolving takes at most its share of the catch-up time');
  }

  // Cycle through every medium for a second, then stop on pencil: the visible pair only ever changes at a settled
  // state, and the last request wins.
  state = {from: 3, to: 1, progress: .1};
  for (let frame = 0; frame < fps; frame++) {
    const request = [2, 3, 1][Math.floor(frame / Math.max(1, Math.round(fps * .1))) % 3];
    const previous = state;
    state = advance(state, request, dt, false, duration, catchUp);
    if (previous.from !== previous.to && state.from !== state.to) {
      const samePair = state.from === previous.from && state.to === previous.to;
      // A fresh wipe may start only from a side the resolved wipe settled on.
      const freshFromSide = state.progress === 0 && (state.from === previous.from || state.from === previous.to);
      assert(samePair || freshFromSide, 'Burst selections never swap a visible side mid-wipe');
    }
  }
  for (let frame = 0; frame < fps * 4; frame++) state = advance(state, 2, dt, false, duration, catchUp);
  assert.deepEqual(state, settledBackdrop(2), 'The last selection is what settles');
}

console.log('Backdrop wipes: continuity, undo in place, catch-up for a third medium, latest selection, reduced motion, frame clamp passed.');
