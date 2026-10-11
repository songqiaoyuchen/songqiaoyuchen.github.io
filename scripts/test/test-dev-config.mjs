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

// With an object, the key is looked up only within that export (config/scene/travel.ts groups share key names).
const groups = [
  'export const A = {',
  '  relief: 0.012,',
  '} as const;',
  '',
  '// relief: a comment',
  'export const B = {',
  '  relief: 0.03,',
  '} as const;',
].join('\n');
assert.ok(replaceKey(groups, 'relief', '0.05', 'B').includes('  relief: 0.012,\n} as const;\n\n// relief: a comment'));
assert.ok(replaceKey(groups, 'relief', '0.05', 'B').endsWith('  relief: 0.05,\n} as const;'));
assert.ok(replaceKey(groups, 'relief', '0.02', 'A').startsWith('export const A = {\n  relief: 0.02,'));
assert.equal(replaceKey(groups, 'relief', '1', 'C'), null);
assert.equal(replaceKey(groups, 'missing', '1', 'A'), null);

console.log('dev config: ok');
