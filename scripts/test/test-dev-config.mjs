// Checks the dev config writer's literal rewriting (app/api/dev-config/literals.ts).
import assert from 'node:assert/strict';
import {replaceKey, toLiteral} from '../../app/api/dev-config/literals.ts';

// Scalars and flat lists keep the file's one-line form; float noise is rounded away.
assert.equal(toLiteral(0.060000000000000005), '0.06');
assert.equal(toLiteral("it's"), "'its'");
assert.equal(toLiteral(true), 'true');
assert.equal(toLiteral([1, -2.5]), '[1, -2.5]');
assert.equal(toLiteral([]), '[]');
assert.equal(toLiteral({}), null);
assert.equal(toLiteral([[1, 2, 3]]), null);

// A list of [x, z] pairs is laid out five per line, indented one level into an object.
const pairs = Array.from({length: 7}, (_, index) => [index, -index / 2]);
assert.equal(toLiteral(pairs), [
  '[',
  '    [0, 0], [1, -0.5], [2, -1], [3, -1.5], [4, -2],',
  '    [5, -2.5], [6, -3],',
  '  ]',
].join('\n'));

// replaceKey swaps the first `key:` literal, flat or nested, and leaves the rest of the file alone.
const source = [
  'export const ROUTE = {',
  '  waypoints: [',
  '    [2.329, -3.446], [2.217, -3.328],',
  '    [-1.84, -0.41],',
  '  ] as readonly PlanPoint[],',
  '};',
  "export const CONFIG = {focusScreen: [-0.45, -0.1] as readonly [number, number], trailColor: '#8fe3d6'};",
].join('\n');
const nested = replaceKey(source, 'waypoints', toLiteral([[1, 2], [3, 4]]));
assert.equal(nested, [
  'export const ROUTE = {',
  '  waypoints: [',
  '    [1, 2], [3, 4],',
  '  ] as readonly PlanPoint[],',
  '};',
  "export const CONFIG = {focusScreen: [-0.45, -0.1] as readonly [number, number], trailColor: '#8fe3d6'};",
].join('\n'));
assert.ok(replaceKey(source, 'focusScreen', '[0, 0]').includes('focusScreen: [0, 0] as readonly'));
assert.ok(replaceKey(source, 'trailColor', "'#fff'").includes("trailColor: '#fff'}"));
assert.equal(replaceKey(source, 'missing', '1'), null);

console.log('dev config: ok');
