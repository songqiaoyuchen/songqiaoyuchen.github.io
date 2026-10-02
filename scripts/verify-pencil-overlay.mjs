// Focused checks for shared medium replacement and image framing. External Playwright only.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ART_BASE_URL || 'http://localhost:3000';
const output = 'tmp/pencil-overlay';
await mkdir(output, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const results = [];
try {
  for (const reduced of [false, true]) {
    const page = await browser.newPage({viewport: {width: 1440, height: 900},
      reducedMotion: reduced ? 'reduce' : 'no-preference'});
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true, renderers: new Map(),
        inject(renderer) { const id = this.renderers.size + 1; this.renderers.set(id, renderer); return id; },
        onCommitFiberRoot: (_id, root) => {
          if (root.containerInfo?.getState?.().camera) window.terrainStore = root.containerInfo;
        },
        onCommitFiberUnmount: () => {}, checkDCE: () => {},
      };
      window.pencilState = () => {
        let result;
        window.terrainStore?.getState().scene.traverse((object) => {
          const u = object.material?.uniforms;
          if (u?.uArtOpacity) result = {
            from: u.uFrom.value, to: u.uTo.value,
            progress: u.uProgress.value, opacity: u.uArtOpacity.value,
            ready: u.uPencil.value?.name === 'Art.pencilIllustration', width: u.uPencil.value?.image?.width};
        });
        return result;
      };
      window.pencilSamples = [];
      const sample = () => {
        const state = window.pencilState();
        if (state) window.pencilSamples.push(state);
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto(`${base}/artworks?selected=emma_two`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.pencilState()?.progress === 1
      && window.pencilState()?.opacity === 1 && window.pencilState()?.to === 2, undefined, {timeout: 60000});
    const samples = await page.evaluate(() => window.pencilSamples);
    assert(samples.some((sample) => sample.ready), 'Image must load');
    if (reduced) assert(samples.every((sample) => sample.progress === 0 || sample.progress === 1),
      'Reduced motion must skip the reveal');
    else assert(samples.some((sample) => sample.progress > .1 && sample.progress < .9),
      'Regular motion must include reveal frames');
    const style = await page.addStyleTag({content: '[class*="leva-c-"] {visibility:hidden !important}'});
    await page.screenshot({path: `${output}/${reduced ? 'reduced' : 'desktop'}-pencil.png`});
    if (!reduced) {
      const hide = await page.addStyleTag({content: 'body * {visibility:hidden !important} canvas[data-engine] {visibility:visible !important}'});
      await page.locator('canvas[data-engine]').screenshot({path: `${output}/desktop-terrain.png`});
      await hide.evaluate((element) => element.remove());
      await page.setViewportSize({width: 390, height: 844});
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => window.pencilState()?.progress), 1, 'Resize must preserve reveal');
      await page.screenshot({path: `${output}/mobile-pencil.png`});
      await page.setViewportSize({width: 1440, height: 900});
      // Featured sequence: Night (digital), Cat (oil), Emma (pencil).
      for (const [from, to, direction] of [[2, 1, 'Previous'], [1, 3, 'Previous'],
        [3, 1, 'Next'], [1, 2, 'Next']]) {
        await page.getByRole('button', {name: `${direction} artwork`, exact: true}).click();
        await page.waitForFunction(([from, to]) => window.pencilState()?.from === from
          && window.pencilState()?.to === to && window.pencilState()?.progress > .35
          && window.pencilState()?.progress < .7, [from, to]);
        assert.equal(await page.evaluate(() => window.pencilState()?.opacity), 1, 'Outgoing image must not fade away');
        await page.screenshot({path: `${output}/transition-${from}-${to}-midpoint.png`});
        await page.waitForFunction((to) => window.pencilState()?.progress === 1 && window.pencilState()?.to === to, to);
        await page.screenshot({path: `${output}/settled-${to}.png`});
      }
    }
    await style.evaluate((element) => element.remove());
    await page.getByRole('link', {name: 'SQYC', exact: true}).click();
    await page.waitForFunction(() => window.pencilState()?.opacity === 0);
    assert.deepEqual(errors, [], 'No runtime or shader errors');
    results.push({reducedMotion: reduced, passed: true, sampledFrames: samples.length});
    await page.close();
  }
} finally {
  await writeFile(`${output}/verification.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results));
