// Checks journey planning (lib/scene/cameraJourney.ts): always one motion straight between two poses, with the
// kind that sets its pace.
import assert from 'node:assert/strict';
import {legKind, planJourney} from '../../lib/scene/cameraJourney.ts';

const route = (from, to) => { const {from: a, to: b, kind} = planJourney(from, to); return `${a}>${b}:${kind}`; };

assert.equal(route('overview', 'art'), 'home>art:art');
assert.equal(route('art', 'overview'), 'art>home:art');
assert.equal(route('overview', 'places'), 'home>places:placesEntry');
assert.equal(route('mobile-overview', 'places'), 'home>places:placesEntry');
assert.equal(route('places', 'mobile-overview'), 'places>home:placesEntry');
assert.equal(route('places', 'places:location'), 'places>places:location:placesFocus');
assert.equal(route('places', 'places:index'), 'places>places:index:placesIndex');
assert.equal(route('places:index', 'places'), 'places:index>places:placesIndex');
assert.equal(route('places:index', 'places:location'), 'places:index>places:location:placesFocus');
assert.equal(route('places:index', 'overview'), 'places:index>home:placesEntry');
assert.equal(route('about:2', 'about:0'), 'about:2>about:0:aboutFocus');
assert.equal(route('about:2', 'about'), 'about:2>about:aboutFocus');
assert.equal(route('about', 'overview'), 'about>home:aboutEntry');
assert.equal(route('projects', 'blog'), 'projects>blog:default');

// One zoom or one shrink, never a stop on the way: a location leaves straight to Art, Art goes straight to Places,
// a direct entry to a location lands there in the one zoom-out.
assert.equal(route('about:1', 'art'), 'about:1>art:art');
assert.equal(route('places', 'art'), 'places>art:placesEntry');
assert.equal(route('art', 'places'), 'art>places:placesEntry');
assert.equal(route('places:location', 'art'), 'places:location>art:placesEntry');
assert.equal(route('places:location', 'overview'), 'places:location>home:placesEntry');
assert.equal(route('about:1', 'places:location'), 'about:1>places:location:placesEntry');
assert.equal(route('overview', 'places:location'), 'home>places:location:placesEntry');

// A viewport change between the overview poses is still a journey.
assert.equal(route('overview', 'mobile-overview'), 'home>home:default');

assert.equal(legKind('art', 'places:location'), 'placesEntry', 'The morph sets the pace whatever the other end');
assert.equal(legKind('about:1', 'art'), 'art');

console.log('camera journey ok');
