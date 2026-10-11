// Checks journey planning (lib/scene/cameraJourney.ts): always one motion straight between two poses, with the
// kind that sets its pace.
import assert from 'node:assert/strict';
import {legKind, planJourney} from '../../lib/scene/cameraJourney.ts';

const route = (from, to) => { const {from: a, to: b, kind} = planJourney(from, to); return `${a}>${b}:${kind}`; };

assert.equal(route('overview', 'art'), 'home>art:art');
assert.equal(route('art', 'overview'), 'art>home:art');
assert.equal(route('overview', 'travel'), 'home>travel:travelEntry');
assert.equal(route('mobile-overview', 'travel'), 'home>travel:travelEntry');
assert.equal(route('travel', 'mobile-overview'), 'travel>home:travelEntry');
assert.equal(route('travel', 'travel:trip'), 'travel>travel:trip:travelFocus');
assert.equal(route('travel', 'travel:index'), 'travel>travel:index:travelIndex');
assert.equal(route('travel:index', 'travel'), 'travel:index>travel:travelIndex');
assert.equal(route('travel:index', 'travel:trip'), 'travel:index>travel:trip:travelFocus');
assert.equal(route('travel:index', 'overview'), 'travel:index>home:travelEntry');
assert.equal(route('about:2', 'about:0'), 'about:2>about:0:aboutFocus');
assert.equal(route('about:2', 'about'), 'about:2>about:aboutFocus');
assert.equal(route('about', 'overview'), 'about>home:aboutEntry');
assert.equal(route('projects', 'blog'), 'projects>blog:default');

// One zoom or one shrink, never a stop on the way: a trip leaves straight to Art, Art goes straight to Travel,
// a direct entry to a trip lands there in the one zoom-out.
assert.equal(route('about:1', 'art'), 'about:1>art:art');
assert.equal(route('travel', 'art'), 'travel>art:travelEntry');
assert.equal(route('art', 'travel'), 'art>travel:travelEntry');
assert.equal(route('travel:trip', 'art'), 'travel:trip>art:travelEntry');
assert.equal(route('travel:trip', 'overview'), 'travel:trip>home:travelEntry');
assert.equal(route('about:1', 'travel:trip'), 'about:1>travel:trip:travelEntry');
assert.equal(route('overview', 'travel:trip'), 'home>travel:trip:travelEntry');

// A viewport change between the overview poses is still a journey.
assert.equal(route('overview', 'mobile-overview'), 'home>home:default');

assert.equal(legKind('art', 'travel:trip'), 'travelEntry', 'The morph sets the pace whatever the other end');
assert.equal(legKind('about:1', 'art'), 'art');

console.log('camera journey ok');
