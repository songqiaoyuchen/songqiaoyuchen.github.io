// Checks scene text visibility, layout retargeting and reduced motion (lib/scene/textTransition.ts).
import assert from 'node:assert/strict';
import {advanceTextTransition, advanceTextVisibility} from '../../lib/scene/textTransition.ts';

const advance = (state, request, reduced = false, delta = .05) =>
  advanceTextTransition(state, request, delta, reduced, 3.2, 4.8);
const home = {key: 'overview:home', visible: true, ready: true};
const art = {key: 'focused:art', visible: false, ready: false};
let state = {key: home.key, visibility: 1};
state = advance(state, art);
assert(state.visibility > 0 && state.visibility < 1, 'Art entry must dissolve, not abruptly hide');
assert.equal(state.key, home.key, 'Retain outgoing layout until fully dissolved');
for (let frame = 0; frame < 100; frame++) {
  const previous = state.visibility;
  state = advance(state, {...art, ready: frame > 10});
  assert(state.visibility <= previous, 'Art must never trigger an incoming text reveal');
}
assert.deepEqual(state, {key: art.key, visibility: 0});

for (let frame = 0; frame < 10; frame++) state = advance(state, {...home, ready: false});
assert.equal(state.visibility, 0, 'Hold text hidden throughout camera return');
state = advance(state, home);
assert(state.visibility > 0 && state.visibility < 1, 'Return must reveal pixels progressively');
for (let frame = 0; frame < 10; frame++) state = advance(state, home);
assert.equal(state.visibility, 1);

const projects = {key: 'focused:projects', visible: true, ready: true};
const blog = {...projects, key: 'focused:blog'};
state = advance({key: projects.key, visibility: 1}, blog);
assert(state.visibility < 1 && state.key === projects.key, 'Focused-to-focused changes must dissolve too');
for (let frame = 0; frame < 5; frame++) state = advance(state, art);
assert.deepEqual(state, {key: art.key, visibility: 0}, 'Rapid retargeting must use the latest destination');

const mobileHome = {...home, key: 'overview-mobile:home'};
const mobileDrawer = {key: 'overview-mobile:about', visible: false, ready: true};
state = {key: mobileHome.key, visibility: 1};
for (let frame = 0; frame < 5; frame++) state = advance(state, mobileDrawer);
assert.equal(state.visibility, 0, 'Mobile drawers hide streams without moving the camera');
for (let frame = 0; frame < 10; frame++) state = advance(state, mobileHome);
assert.equal(state.visibility, 1, 'Mobile streams return after closing the drawer');

assert.deepEqual(advance({key: home.key, visibility: 1}, {...art, ready: true}, true),
  {key: art.key, visibility: 0}, 'Reduced motion respects hidden Art state');
assert.deepEqual(advance(state, home, true), {key: home.key, visibility: 1});
assert.equal(advance({key: art.key, visibility: 0}, art).visibility, 0, 'Direct Art entry stays hidden');
assert(advance({key: home.key, visibility: 1}, art, false, 10).visibility > 0,
  'A stalled frame must not skip the entire pixel exit');
assert.equal(advanceTextVisibility(.1, false, .05, false, 2.4, 4.8), 0,
  'Hero/decorative visibility reaches exact zero without residual pixels');
console.log('Text transitions: Art entry/return, camera wait, rapid input, focused changes, mobile, reduced motion, and endpoints passed.');
