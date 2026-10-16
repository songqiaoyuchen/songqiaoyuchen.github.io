// Opt-in camera regression check. Uses the same external Playwright setup as verify-art.mjs.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {CAMERA_CONFIG} from '../../config/scene/camera.ts';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ART_BASE_URL || 'http://localhost:3001';
const output = path.resolve(process.env.ARTIFACT_DIR || 'tmp/art-camera');
await mkdir(output, {recursive: true});
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {channel: 'chrome'}),
  headless: true,
});
const results = [];
const destination = CAMERA_CONFIG.artPosition;
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));

async function verify(name, options, entry) {
  const context = await browser.newContext({
    viewport: {width: 1440, height: 900},
    ...options,
  });
  // Read the actual R3F store through React's observer hook; no application test hooks.
  await context.addInitScript(() => {
    let renderer = 0;
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      inject: () => ++renderer,
      onCommitFiberRoot: (_id, root) => {
        if (root.containerInfo?.getState?.().camera) window.cameraStore = root.containerInfo;
      },
      onCommitFiberUnmount: () => {},
      checkDCE: () => {},
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(base, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => window.cameraStore && document.querySelector('[aria-busy="false"]'),
    undefined, {timeout: 60000});
  if (entry === 'about') {
    await page.getByRole('button', {name: 'Open about preview'}).click();
    await page.waitForTimeout(2400);
  }
  await page.screenshot({path: path.join(output, `${name}-before.png`)});
  await page.evaluate(() => {
    window.cameraSamples = [];
    window.originalCamera = window.cameraStore.getState().camera;
    window.originalCanvas = document.querySelector('canvas');
    window.recordCamera = true;
    const start = performance.now();
    function sample() {
      if (!window.recordCamera) return;
      const {camera} = window.cameraStore.getState();
      const content = document.querySelector('.art-environment .art-content');
      window.cameraSamples.push({
        time: performance.now() - start,
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        opacity: content ? Number(getComputedStyle(content).opacity) : 0,
        sameCamera: camera === window.originalCamera,
        sameCanvas: document.querySelector('canvas') === window.originalCanvas,
      });
      requestAnimationFrame(sample);
    }
    sample();
  });
  if (entry === 'stream') await page.getByRole('button', {name: 'Open art preview'}).click();
  else await page.getByRole('link', {name: 'Art', exact: true}).click();
  await page.waitForURL('**/artworks');
  for (let index = 1; index <= 3; index++) {
    await page.waitForTimeout(250);
    await page.screenshot({path: path.join(output, `${name}-moving-${index}.png`)});
  }
  await page.waitForFunction(() => document.querySelector('[data-art-arriving="false"].art-environment'));
  await page.waitForTimeout(800);
  await page.screenshot({path: path.join(output, `${name}-after.png`)});
  const samples = await page.evaluate(() => {
    window.recordCamera = false;
    return window.cameraSamples;
  });
  assert(samples.every((sample) => sample.sameCamera && sample.sameCanvas), 'Camera and canvas must persist');
  const first = samples[0];
  const last = samples.at(-1);
  assert(distance(last.position, destination) < 0.001, 'Camera must reach the Art pose');
  const length = distance(first.position, destination);
  const intermediates = samples.filter((sample) => {
    const remaining = distance(sample.position, destination);
    return remaining > 0.02 && remaining < length - 0.02;
  });
  if (options.reducedMotion !== 'reduce') {
    assert(intermediates.length >= 10, 'Expected a continuous physical camera journey');
    for (let index = 1; index < samples.length; index++) {
      const step = distance(samples[index].position, samples[index - 1].position);
      assert(step < length * 0.3, `Camera jumped ${step} units`);
      assert(distance(samples[index].position, destination)
        <= distance(samples[index - 1].position, destination) + 0.001, 'Camera reversed toward overview');
    }
    assert(intermediates.every((sample) => sample.opacity === 0), 'Gallery obscured camera places');
  }
  assert(last.opacity > 0.99, 'Gallery must become visible after arrival');
  const look = CAMERA_CONFIG.artLookAt.map((value, index) => value - last.position[index]);
  const magnitude = Math.hypot(...look);
  const [x, y, z, w] = last.quaternion;
  const forward = [-2 * (x * z + w * y), -2 * (y * z - w * x), -(1 - 2 * (x * x + y * y))];
  assert(distance(forward, look.map((value) => value / magnitude)) < 0.001, 'Look-at must reach Art focus');
  for (let artwork = 0; artwork < 6; artwork++) {
    await page.locator('.art-carousel').press('ArrowRight');
    await page.waitForTimeout(1600);
    const pose = await page.evaluate(() => {
      const {camera} = window.cameraStore.getState();
      return {position: camera.position.toArray(), quaternion: camera.quaternion.toArray()};
    });
    assert(distance(pose.position, last.position) < 0.00001, 'Medium changes must not move the camera');
    assert(distance(pose.quaternion, last.quaternion) < 0.00001, 'Medium changes must not rotate the camera');
  }
  await page.getByRole('link', {name: 'SQYC', exact: true}).click();
  await page.waitForURL(base + '/');
  await page.waitForFunction((start) => {
    const p = window.cameraStore.getState().camera.position.toArray();
    return Math.hypot(...p.map((value, index) => value - start[index])) < 0.02;
  }, entry === 'about' ? [7.051, 13.416, -9.158] : first.position, {timeout: 30000});
  assert.deepEqual(errors, [], 'No runtime or shader errors');
  await context.close();
  await writeFile(path.join(output, `${name}-camera.json`), JSON.stringify(samples, null, 2));
  results.push({name, frames: samples.length, intermediateFrames: intermediates.length, passed: true});
  console.log(`PASS ${name}: ${intermediates.length} intermediate camera frames`);
}

try {
  await verify('desktop-stream', {}, 'stream');
  await verify('desktop-from-about', {}, 'about');
  await verify('mobile-stream', {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}, 'stream');
  await verify('reduced-motion', {reducedMotion: 'reduce'}, 'stream');
} catch (error) {
  results.push({passed: false, error: error.message});
  throw error;
} finally {
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
