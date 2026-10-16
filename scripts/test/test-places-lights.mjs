// Checks the Places globe's map reading and light sampling (lib/scene/placesWorker.ts): the hash and the golden
// spiral against their formulas, the bilinear sampler against the shaders' texel layout, the summary's blur and the
// row flip for a texture, and the light points against the sampler as PlacesLights first wrote it, point for point.
import assert from 'node:assert/strict';
import {
  blurMap, flipRows, hash, lightSample, sampleLights, sampleMap, summarizeMap,
} from '../../lib/scene/placesWorker.ts';

// The hash, as the points' shader-style noise.
{
  const value = Math.sin(3 * 127.1 + 0.37 * 311.7) * 43758.5453;
  assert.equal(hash(3, 0.37), value - Math.floor(value));
  for (let index = 0; index < 50; index++) {
    const h = hash(index, 0.91);
    assert.ok(h >= 0 && h < 1);
  }
}

// The spiral: unit points, from the north pole down to the south, each nudged by the hash of its index.
{
  const samples = 50;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const spacing = Math.sqrt(4 * Math.PI / samples);
  const out = {x: 0, y: 0, z: 0};
  let previousY = 2;
  for (let index = 0; index < samples; index++) {
    const {x, y, z} = lightSample(index, samples, out);
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-12, `unit at ${index}`);
    // The jitter is under a sample spacing, so the descent is kept.
    assert.ok(y < previousY + 2 * 0.9 * spacing, `descending at ${index}`);
    previousY = y;
  }
  const index = 7;
  const y0 = 1 - (index / (samples - 1)) * 2;
  const ring = Math.sqrt(1 - y0 * y0);
  const theta = golden * index;
  const east = (hash(index, 0.37) - 0.5) * 2 * 0.9 * spacing;
  const north = (hash(index, 0.91) - 0.5) * 2 * 0.9 * spacing;
  const x = Math.cos(theta) * ring - Math.sin(theta) * east - y0 * Math.cos(theta) * north;
  const z = Math.sin(theta) * ring + Math.cos(theta) * east - y0 * Math.sin(theta) * north;
  const y = y0 + ring * north;
  const length = Math.hypot(x, y, z);
  lightSample(index, samples, out);
  assert.deepEqual([out.x, out.y, out.z], [x / length, y / length, z / length]);
}

// The sampler reads texel centres (u = 0.5 + lon / 360, v = 0.5 + lat / 180 on a map whose top row is north),
// wrapping east-west and clamped at the poles.
{
  const width = 4;
  const height = 2;
  const map = Uint8Array.from([0, 255, 0, 255, 255, 0, 255, 0]);
  assert.equal(sampleMap(map, width, height, -135, 90), 0, 'first texel centre, top row');
  assert.equal(sampleMap(map, width, height, -45, 90), 1, 'second texel');
  assert.equal(sampleMap(map, width, height, -90, 90), 0.5, 'between the two');
  assert.equal(sampleMap(map, width, height, -135, 0), 0.5, 'between the rows');
  assert.equal(sampleMap(map, width, height, -135, -90), 1, 'bottom row, clamped');
  assert.equal(sampleMap(map, width, height, 135, 90), 1, 'last texel');
  assert.equal(sampleMap(map, width, height, 180, 90), 0.5, 'wraps to the first');
  assert.equal(sampleMap(map, width, height, -180, 90), 0.5, 'and back');
}

// The summary: a blur of 0 leaves the map; a box blur keeps a constant map; the flip reverses the rows.
{
  const width = 4;
  const height = 3;
  const heights = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(summarizeMap({width, height, heights}, 0), heights);
  const flat = new Uint8Array(width * height).fill(100);
  assert.deepEqual(summarizeMap({width, height, heights: flat}, 2), flat);
  const values = Float32Array.from(heights);
  blurMap(values, width, height, 1);
  // The corner takes in its neighbours (the row wrapping round, the row below standing in for the one above).
  assert.ok(values[0] > 1 && values[0] < 12);
  assert.ok(values.every((value) => value >= 1 && value <= 12));
  assert.deepEqual(flipRows(heights, width, height), Uint8Array.from([9, 10, 11, 12, 5, 6, 7, 8, 1, 2, 3, 4]));
}

// The light points, against the loop as PlacesLights first wrote it (number arrays pushed, heightAt and summaryAt
// closures) over a small map: the same points in the same order, on land, north of the Antarctic, the same twice.
{
  const width = 32;
  const height = 16;
  const heights = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      // Sea in the west, land rising eastward, a mountain row across the north.
      const land = column < width / 2 ? 0 : 40 + column * 5;
      heights[row * width + column] = row === 2 ? 255 : land;
    }
  }
  const map = {width, height, heights};
  const summary = summarizeMap(map, 1);
  const samples = 20000;
  const density = 0.6;
  const reference = (() => {
    const heightAt = ([lon, lat]) => sampleMap(heights, width, height, lon, lat);
    const summaryAt = ([lon, lat]) => sampleMap(summary, width, height, lon, lat);
    const positions = [];
    const pointHeights = [];
    const summaries = [];
    const intensities = [];
    const seeds = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const spacing = Math.sqrt(4 * Math.PI / samples);
    for (let index = 0; index < samples; index++) {
      const y0 = 1 - (index / (samples - 1)) * 2;
      const ring = Math.sqrt(1 - y0 * y0);
      const theta = golden * index;
      const east = (hash(index, 0.37) - 0.5) * 2 * 0.9 * spacing;
      const north = (hash(index, 0.91) - 0.5) * 2 * 0.9 * spacing;
      let x = Math.cos(theta) * ring - Math.sin(theta) * east - y0 * Math.cos(theta) * north;
      let z = Math.sin(theta) * ring + Math.cos(theta) * east - y0 * Math.sin(theta) * north;
      let y = y0 + ring * north;
      const length = Math.hypot(x, y, z);
      x /= length; y /= length; z /= length;
      const lat = Math.asin(y) * 180 / Math.PI;
      const lon = Math.atan2(x, z) * 180 / Math.PI;
      if (lat < -60) continue;
      const h = heightAt([lon, lat]);
      if (h < 0.004) continue;
      const lowland = Math.pow(1 - Math.min(h * 2.2, 1), 1.5);
      const cluster = 0.5 + 0.5 * Math.sin(lon * 0.21 + 1.3) * Math.sin(lat * 0.37 + 0.4)
        + 0.4 * Math.sin(lon * 0.9) * Math.cos(lat * 0.7);
      if (hash(lon * 3.1, lat * 2.7) > density * (0.65 + 1.3 * lowland * Math.max(cluster, 0.2))) continue;
      positions.push(x, y, z);
      pointHeights.push(h);
      summaries.push(summaryAt([lon, lat]));
      intensities.push(0.35 + 0.65 * Math.pow(hash(lat * 5.3, lon * 7.1), 1.8) * (0.4 + 0.6 * lowland));
      seeds.push(hash(lon * 1.7, lat * 9.3));
    }
    return {
      positions: new Float32Array(positions), heights: new Float32Array(pointHeights),
      summaries: new Float32Array(summaries), intensities: new Float32Array(intensities),
      seeds: new Float32Array(seeds),
    };
  })();
  const lights = sampleLights(map, summary, density, samples);
  assert.ok(lights.heights.length > 100, 'points were kept');
  assert.equal(lights.positions.length, lights.heights.length * 3);
  assert.deepEqual(lights, reference);
  assert.deepEqual(sampleLights(map, summary, density, samples), lights, 'the same twice');
  for (let index = 0; index < lights.heights.length; index++) {
    const [x, y, z] = lights.positions.subarray(index * 3, index * 3 + 3);
    assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-6);
    assert.ok(Math.asin(y) * 180 / Math.PI >= -60, 'north of the Antarctic');
    assert.ok(lights.heights[index] >= 0.004, 'on land');
    assert.ok(lights.seeds[index] >= 0 && lights.seeds[index] < 1);
  }
  assert.ok(sampleLights(map, summary, 1, samples).heights.length > lights.heights.length, 'denser');
  assert.equal(sampleLights(map, summary, 0, samples).heights.length, 0, 'none at zero density');
}

console.log('places lights checks passed');
