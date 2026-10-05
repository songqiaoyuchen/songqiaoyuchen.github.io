import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve(process.env.ARTIFACT_DIR || 'tmp/art-layout');
const base = process.env.ART_BASE_URL || 'http://localhost:3000';
await mkdir(output, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const results = [];
try {
  for (const [width, height, touch] of [
    [1440, 900, false], [1366, 768, false], [1280, 720, false], [1024, 600, false],
    [390, 844, true], [320, 568, true], [844, 390, true],
  ]) {
    const context = await browser.newContext({viewport: {width, height}, hasTouch: touch, isMobile: touch});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/artworks`, {waitUntil: 'networkidle'});
    await page.locator('.art-scene-status').waitFor({state: 'hidden', timeout: 60000});
    await page.evaluate(() => document.fonts.ready);
    for (let work = 0; work < 6; work++) {
      await page.waitForTimeout(850);
      const layout = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON();
        const slides = [...document.querySelectorAll('.art-carousel-slide:not([inert])')];
        return {
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          caption: rect('.art-caption'), stage: rect('.art-carousel'),
          center: rect('.art-carousel-slide[data-current="true"]'),
          neighbors: slides.filter((slide) => slide.dataset.current !== 'true')
            .map((slide) => slide.getBoundingClientRect().toJSON()),
          title: document.querySelector('.art-caption h2').textContent,
          description: document.querySelector('.art-label-description')?.textContent,
        };
      });
      const name = `${width}x${height}-${work}`;
      await page.screenshot({path: path.join(output, `${name}.png`)});
      assert(layout.scrollHeight <= height + 1, `${name}: page scrolls (${layout.scrollHeight})`);
      assert(layout.scrollWidth <= width + 1, `${name}: horizontal overflow`);
      assert(layout.caption.bottom <= height + 1, `${name}: caption below viewport`);
      assert(layout.center.height > 85 && layout.center.width > 85, `${name}: central image too small`);
      const axis = touch ? ['top', 'bottom', 'height'] : ['left', 'right', 'width'];
      for (const neighbor of layout.neighbors) {
        const visible = Math.max(0, Math.min(neighbor[axis[1]], layout.stage[axis[1]])
          - Math.max(neighbor[axis[0]], layout.stage[axis[0]]));
        assert(visible >= Math.min(40, neighbor[axis[2]] * 0.2), `${name}: neighbor is a sliver`);
      }
      results.push({name, ...layout, passed: true});
      // Desktop has no arrows; keys browse every layout (touch layouts also have the swipe rail).
      await page.locator('.art-carousel').press('ArrowRight');
    }
    await page.waitForTimeout(850);
    await page.getByRole('link', {name: 'View K2', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('.art-caption h2').textContent === 'K2');
    await page.getByRole('link', {name: 'Enlarge K2', exact: true}).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('link', {name: 'All works', exact: false}).click();
    await page.waitForFunction(() => document.querySelectorAll('.art-grid-work').length === 13);
    assert.equal(await page.locator('.art-grid-work').count(), 13);
    await page.getByRole('link', {name: 'SQYC', exact: true}).click();
    await page.waitForURL(`${base}/`);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}x${height}: six works fit, neighbors, inspection, collection and Home`);
    await context.close();
  }
} catch (error) {
  results.push({passed: false, error: error.message});
  throw error;
} finally {
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
