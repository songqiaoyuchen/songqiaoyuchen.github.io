// Run against `npm run start` with PLAYWRIGHT_MODULE pointing to an installed
// Playwright package. No browser-testing dependency is added to the website.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve(process.env.ARTIFACT_DIR || 'tmp/art-verification');
const base = process.env.ART_BASE_URL || 'http://localhost:3001';
await mkdir(output, {recursive: true});
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {channel: 'chrome'}),
});
const results = [];
const errors = [];
const requests = [];
const context = await browser.newContext({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() >= 400) requests.push(`${response.status()} ${response.url()}`);
});

async function check(name, run) {
  try {
    await run();
    results.push({name, passed: true});
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({name, passed: false, error: error.message});
    await page.screenshot({path: path.join(output, 'failure.png'), fullPage: true}).catch(() => {});
    throw error;
  }
}
async function caption(title) {
  await page.waitForFunction((text) => document.querySelector('.art-caption h2')?.textContent === text, title);
}
async function capture(name, target = page) {
  await target.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter((img) => img.loading !== 'lazy' || img.complete)
      .map((img) => img.decode().catch(() => {})));
  });
  // Allow the explicitly finite carousel/material transitions to settle.
  await target.waitForTimeout(1400);
  const modal = await target.locator('dialog[open]').count() > 0;
  const touchLandscape = await target.evaluate(() => matchMedia('(pointer: coarse)').matches && innerWidth > 767);
  await target.screenshot({path: path.join(output, `${name}.png`), fullPage: !modal && !touchLandscape});
}
async function noOverflow(target = page) {
  assert.equal(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
}

try {
  await check('Direct Art entry, usable content, scene readiness and desktop layout', async () => {
    await page.goto(`${base}/artworks`, {waitUntil: 'networkidle'});
    await caption('Ama Dablam');
    await page.waitForFunction(() => !!document.querySelector('canvas'));
    await page.locator('.art-scene-status').waitFor({state: 'hidden', timeout: 60000});
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.getByRole('link', {name: 'Art', exact: true}).getAttribute('aria-current'), 'page');
    await noOverflow();
    await page.locator('canvas[data-engine]').evaluate((canvas) => { canvas.dataset.persistenceTest = 'retained'; });
    await capture('desktop-oil');
  });
  await check('Wheel, keyboard, same-medium selection and hidden-slide inertness', async () => {
    await page.locator('.art-carousel').hover();
    await page.mouse.wheel(0, 100);
    await caption('K2');
    assert.equal(await page.locator('.art-section').getAttribute('data-medium'), 'oil');
    await page.locator('.art-carousel').focus();
    await page.keyboard.press('ArrowRight');
    await caption('Night');
    assert.equal(await page.locator('.art-section').getAttribute('data-medium'), 'digital');
    assert.equal(await page.locator('.art-carousel-slide:not([inert])').count(), 3);
    assert.equal(await page.getByRole('link', {name: /^Enlarge /}).count(), 1);
    await capture('desktop-digital');
    await page.locator('.art-carousel').press('ArrowRight');
    await caption("Gwen's Cat");
    await page.locator('.art-carousel').press('ArrowRight');
    await caption('Emma Watson');
    await capture('desktop-pencil');
  });
  await check('Inspection, URL, focus containment, Escape and focus restoration', async () => {
    await page.getByRole('link', {name: 'Enlarge Emma Watson'}).click();
    await page.getByRole('dialog').waitFor();
    assert.match(page.url(), /artworks\/emma_two/);
    assert.equal(await page.evaluate(() => document.querySelector('dialog').matches(':modal')), true);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true);
    }
    await capture('desktop-inspection');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({state: 'detached'});
    await caption('Emma Watson');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Enlarge Emma Watson');
    await page.goForward();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('link', {name: 'Close artwork and return to collection'}).click();
    await page.getByRole('dialog').waitFor({state: 'detached'});
  });
  await check('Full-width collection, medium scrolling, detail return and scroll preservation', async () => {
    await page.getByRole('link', {name: 'All works'}).click();
    await page.waitForFunction(() => document.querySelectorAll('.art-grid-work').length === 13);
    assert.equal(await page.locator('.art-medium-section').count(), 3);
    assert.equal(await page.locator('.art-gallery').evaluate((element) => {
      const section = element.closest('.art-section');
      const style = getComputedStyle(section);
      return Math.abs(element.getBoundingClientRect().width - section.clientWidth
        + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)) < 2;
    }), true);
    await capture('desktop-all');
    for (const id of ['oil', 'digital', 'pencil']) {
      const link = page.locator(`.art-medium-nav a[href="#${id}"]`);
      await link.click();
      await page.waitForFunction((medium) => {
        const section = document.getElementById(medium);
        const top = section.getBoundingClientRect().top + scrollY
          - parseFloat(getComputedStyle(section).scrollMarginTop);
        const target = Math.min(top, document.documentElement.scrollHeight - innerHeight);
        return Math.abs(scrollY - target) < 2
          && document.querySelector('.art-section')?.getAttribute('data-medium') === medium
          && document.querySelector('.art-medium-nav [aria-current]')?.getAttribute('href') === `#${medium}`;
      }, id);
      assert.equal(await page.locator('.art-grid-work').count(), 13);
    }
    const work = page.locator('.art-grid-work').last();
    await work.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await work.click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('link', {name: 'Close artwork and return to collection'}).click();
    await page.getByRole('dialog').waitFor({state: 'detached'});
    assert.match(page.url(), /medium=pencil/);
    assert.equal(await page.locator('.art-grid-work').count(), 13);
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - scroll) < 5);
    await page.getByRole('link', {name: 'Selected works', exact: false}).click();
    await caption('Emma Watson');
    await page.reload({waitUntil: 'networkidle'});
    await caption('Emma Watson');
  });
  await check('Home / Art continuity and both Art entry points', async () => {
    await page.locator('.art-scene-status').waitFor({state: 'hidden', timeout: 60000});
    await page.locator('canvas[data-engine]').evaluate((canvas) => { canvas.dataset.persistenceTest = 'retained'; });
    await page.getByRole('link', {name: 'SQYC', exact: true}).click();
    await page.waitForURL(base + '/');
    assert.equal(await page.locator('canvas[data-engine]').getAttribute('data-persistence-test'), 'retained');
    assert.equal(await page.locator('[aria-busy="true"]').count(), 0);
    await page.getByRole('button', {name: 'Open about preview', exact: true}).click();
    await page.getByRole('link', {name: 'Art', exact: true}).click();
    await caption('Ama Dablam');
    await page.getByRole('link', {name: 'SQYC', exact: true}).click();
    await page.waitForURL(base + '/');
    assert.equal(await page.locator('#section-preview[aria-hidden="false"]').count(), 0);
    await page.getByRole('button', {name: 'Open art preview', exact: true}).click();
    await caption('Ama Dablam');
    assert.equal(await page.locator('canvas[data-engine]').getAttribute('data-persistence-test'), 'retained');
    await page.locator('.art-carousel').press('ArrowRight');
    await caption('K2');
    await page.getByRole('link', {name: 'Art', exact: true}).click();
    await caption('K2');
    await page.getByRole('link', {name: 'Projects', exact: true}).click();
    await page.waitForURL(/\/projects\/?$/);
    await page.getByRole('link', {name: 'Art', exact: true}).click();
    await caption('Ama Dablam');
  });
  await check('Direct detail, refresh and predictable local return', async () => {
    await page.goto(`${base}/artworks/winter`, {waitUntil: 'networkidle'});
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('#inspection-title').textContent(), 'Winter of 2022');
    await page.reload({waitUntil: 'networkidle'});
    await page.getByRole('link', {name: 'Close artwork and return to collection'}).click();
    await page.waitForURL(/\/artworks\/all\/?$/);
    assert.equal(await page.locator('.art-grid-work').count(), 13);
  });
  await check('Mobile vertical carousel, swipe, inspection, grid and small-screen overflow', async () => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto(`${base}/artworks`, {waitUntil: 'networkidle'});
    await page.locator('.art-scene-status').waitFor({state: 'hidden', timeout: 60000});
    await capture('mobile-gallery');
    await noOverflow();
    const stage = await page.locator('.art-carousel').boundingBox();
    await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2 + 80);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2 - 80, {steps: 12});
    await page.mouse.up();
    await caption('K2');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('link', {name: 'Enlarge K2'}).click();
    await page.getByRole('dialog').waitFor();
    await capture('mobile-inspection');
    await page.keyboard.press('Escape');
    await page.getByRole('link', {name: 'All works'}).click();
    await page.waitForFunction(() => document.querySelectorAll('.art-grid-work').length === 13);
    await capture('mobile-all');
    await page.setViewportSize({width: 320, height: 568});
    await noOverflow();
    await page.getByRole('link', {name: 'Selected works', exact: false}).click();
    await capture('mobile-small');
    await noOverflow();
  });
  await check('Tablet, landscape mobile and reduced-motion layout', async () => {
    await page.setViewportSize({width: 768, height: 1024});
    await capture('tablet-gallery');
    await noOverflow();
    await page.setViewportSize({width: 844, height: 390});
    await capture('mobile-landscape');
    await noOverflow();
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.setViewportSize({width: 1440, height: 1000});
    await page.locator('.art-carousel').press('ArrowRight');
    await caption('Night');
    assert.equal(await page.locator('.art-carousel-slide').first().evaluate((el) => getComputedStyle(el).transitionDuration), '0s');
    await capture('reduced-motion');
    await page.goto('about:blank');
  });
  await check('Server-rendered collection and direct artwork without JavaScript', async () => {
    const noJS = await browser.newContext({javaScriptEnabled: false, viewport: {width: 1440, height: 1000}});
    const p = await noJS.newPage();
    await p.goto(`${base}/artworks/all`, {waitUntil: 'networkidle'});
    assert.equal(await p.locator('.art-grid-work').count(), 13);
    assert.match(await p.locator('h1').textContent(), /^All works/);
    await p.locator('.art-grid-work').filter({hasText: 'Winter of 2022'}).click();
    assert.equal(await p.locator('#inspection-title').textContent(), 'Winter of 2022');
    assert.equal(await p.getByRole('dialog').isVisible(), true);
    await p.getByRole('link', {name: 'Close artwork and return to collection'}).click();
    assert.equal(await p.locator('.art-grid-work').count(), 13);
    await capture('no-javascript', p);
    await noJS.close();
  });
  await check('Touch gestures and vertical carousel in phone landscape orientation', async () => {
    const mobile = await browser.newContext({
      viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
    });
    const p = await mobile.newPage();
    await p.goto(`${base}/artworks`, {waitUntil: 'networkidle'});
    const box = await p.locator('.art-carousel').boundingBox();
    const cdp = await mobile.newCDPSession(p);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y: y + 75}]});
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y: y + 75 - i * 20}]});
    }
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await p.waitForFunction(() => document.querySelector('.art-caption h2')?.textContent === 'K2');
    assert.equal(await p.getByRole('dialog').count(), 0);
    await p.setViewportSize({width: 844, height: 390});
    assert.equal(await p.locator('.art-mobile-hint').count(), 0);
    assert.equal(await p.locator('.art-section').evaluate((el) => getComputedStyle(el).display), 'grid');
    await capture('touch-landscape', p);
    await noOverflow(p);
    await mobile.close();
  });
  await check('WebGL unavailable: all artwork actions remain usable', async () => {
    const fallback = await browser.newContext({viewport: {width: 390, height: 844}});
    await fallback.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return type.includes('webgl') ? null : getContext.call(this, type, ...args);
      };
    });
    const p = await fallback.newPage();
    await p.goto(`${base}/artworks`, {waitUntil: 'networkidle'});
    const heading = await p.locator('.art-stage').boundingBox();
    assert.ok(heading.y < 200, 'Fallback terrain must not push the gallery below the viewport');
    await p.locator('.art-carousel').press('ArrowRight');
    await p.getByRole('link', {name: 'Enlarge K2'}).click();
    await p.getByRole('dialog').waitFor();
    await p.getByRole('link', {name: 'Close artwork and return to collection'}).click();
    await p.getByRole('link', {name: 'All works'}).click();
    await p.waitForFunction(() => document.querySelectorAll('.art-grid-work').length === 13);
    assert.equal(await p.locator('.art-grid-work').count(), 13);
    await capture('webgl-fallback', p);
    await fallback.close();
  });
  await check('Image failure feedback and return remain accessible', async () => {
    const failedImage = await browser.newContext({viewport: {width: 390, height: 844}});
    await failedImage.route('**/*', (route) => {
      const url = decodeURIComponent(route.request().url());
      return url.includes('/images/artworks/oil/ama-dablam.webp') ? route.abort() : route.continue();
    });
    const p = await failedImage.newPage();
    await p.goto(`${base}/artworks/amadablam`, {waitUntil: 'networkidle'});
    await p.getByText('The image could not load.', {exact: false}).waitFor();
    await p.getByRole('link', {name: 'Open the original image'}).focus();
    await p.keyboard.press('Tab');
    assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Close artwork and return to collection');
    await capture('image-failure', p);
    await p.getByRole('link', {name: 'Close artwork and return to collection'}).click();
    await p.waitForFunction(() => document.querySelectorAll('.art-grid-work').length === 13);
    await failedImage.close();
  });
  await check('No application errors, shader errors or failed network responses', async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
  });
} finally {
  await writeFile(path.join(output, 'results.json'), JSON.stringify({base, results, errors, requests}, null, 2));
  await browser.close();
}
