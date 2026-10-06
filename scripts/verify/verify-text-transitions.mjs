// Opt-in browser regression checks; use an external PLAYWRIGHT_MODULE.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ART_BASE_URL || 'http://localhost:3000';
const output = path.resolve(process.env.ARTIFACT_DIR || 'tmp/text-transitions');
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true,
  ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {channel: 'chrome'})});
const results = [];
let currentPage;

async function instrument(page) {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '[class*="leva-c-"] {visibility:hidden !important; pointer-events:none !important}';
      document.head.append(style);
    });
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, renderers: new Map(),
      inject(renderer) { const id = this.renderers.size + 1; this.renderers.set(id, renderer); return id; },
      onCommitFiberRoot: (_id, root) => {
        if (root.containerInfo?.getState?.().camera) window.terrainStore = root.containerInfo;
      },
      onCommitFiberUnmount: () => {}, checkDCE: () => {},
    };
    window.textState = () => {
      const result = {};
      window.terrainStore?.getState().scene.traverse((object) => {
        const u = object.material?.uniforms;
        if (u?.uDissolve) {
          const key = u.uHover.value.length === 1 ? 'hero' : 'links';
          result[key] = u.uDissolve.value;
          result[`${key}PixelMask`] = object.material.fragmentShader.includes('dissolveNoise > uDissolve');
        }
        if (u?.uVisibility && u?.uTexture) result.decor = u.uVisibility.value;
      });
      return result;
    };
    window.textSamples = [];
    const sample = () => {
      const state = window.textState();
      if (state.links !== undefined && state.hero !== undefined && state.decor !== undefined) {
        window.textSamples.push({...state, time: performance.now(), path: location.pathname});
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function homeReady(page, mobile) {
  await page.waitForFunction((mobile) => {
    const s = window.textState();
    return location.pathname === '/' && s.links === 1 && s.hero === (mobile ? 0 : 1) && s.decor === 1
      && [...document.querySelectorAll('.scene-link-hit')].every((button) => !button.disabled);
  }, mobile, {timeout: 90000});
}
async function artReady(page) {
  await page.waitForFunction(() => {
    const s = window.textState();
    return location.pathname.startsWith('/artworks') && s.links === 0 && s.hero === 0 && s.decor === 0
      && document.querySelector('[data-art-arriving="false"]')
      && !document.querySelector('.art-scene-status');
  }, undefined, {timeout: 90000});
}
async function resetSamples(page) { await page.evaluate(() => { window.textSamples = []; }); }
async function samples(page) { return page.evaluate(() => window.textSamples); }
function assertPixelFrames(frames, key, reduced, message) {
  assert(frames.length > 0, 'Must observe rendered frames');
  if (reduced) assert(frames.every((s) => s[key] === 0 || s[key] === 1), message);
  else assert(frames.some((s) => s[key] > 0 && s[key] < 1), message);
}

try {
  for (const {name, mobile, reduced} of [
    {name: 'desktop', mobile: false, reduced: false},
    {name: 'mobile', mobile: true, reduced: false},
    {name: 'reduced', mobile: false, reduced: true},
  ].filter(({name}) => !process.argv[2] || process.argv[2] === name)) {
    const context = await browser.newContext({viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 900},
      reducedMotion: reduced ? 'reduce' : 'no-preference'});
    const page = await context.newPage();
    currentPage = page;
    const errors = [];
    const resourceWarnings = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const entry = `${message.text()} (${message.location().url})`;
      // Existing metadata gap tracked in docs/todos/production.md.
      if (message.location().url === `${base}/favicon.ico` && message.text().includes('404')) resourceWarnings.push(entry);
      else errors.push(entry);
    });
    page.on('response', (response) => {
      if (response.status() < 400) return;
      const entry = `${response.status()} ${response.url()}`;
      if (response.url() === `${base}/favicon.ico` && response.status() === 404) resourceWarnings.push(entry);
      else errors.push(entry);
    });
    await instrument(page);
    await page.goto(base, {waitUntil: 'domcontentloaded'});
    await homeReady(page, mobile);
    console.log(`${name}: home ready`);
    assert.equal(await page.locator('.scene-link-hit').count(), 4);
    const initial = await page.evaluate(() => window.textState());
    assert(initial.linksPixelMask && initial.heroPixelMask, 'Both text meshes must use the pixel discard shader');

    await resetSamples(page);
    await page.getByRole('button', {name: 'Open art preview', exact: true}).click();
    await artReady(page);
    await page.waitForTimeout(500);
    const entry = await samples(page);
    for (const key of ['links', 'decor', ...(mobile ? [] : ['hero'])]) {
      assertPixelFrames(entry, key, reduced, `${name}: ${key} must dissolve out`);
      const zero = entry.findIndex((s) => s[key] === 0);
      assert(zero >= 0 && entry.slice(zero).every((s) => s[key] === 0), `${key} must not reappear in Art`);
    }
    assert.equal(await page.locator('.scene-link-hit').count(), 0, 'Art has no hidden link hit targets');
    await page.screenshot({path: path.join(output, `${name}-art.png`)});

    await resetSamples(page);
    await page.getByRole('link', {name: 'SQYC', exact: true}).click();
    await homeReady(page, mobile);
    const returning = await samples(page);
    for (const key of ['links', 'decor', ...(mobile ? [] : ['hero'])]) {
      assertPixelFrames(returning, key, reduced, `${name}: ${key} must dissolve in`);
    }
    await page.screenshot({path: path.join(output, `${name}-home.png`)});
    console.log(`${name}: first Art entry and return passed`);

    await page.getByRole('button', {name: 'Open projects preview', exact: true}).click();
    await page.waitForFunction((mobile) => window.textState().hero === 0
      && window.textState().links === (mobile ? 0 : 1)
      && !!document.querySelector('aside[aria-label="Projects preview"]:not([inert])'), mobile);
    if (!mobile) {
      await resetSamples(page);
      await page.getByRole('button', {name: 'Open blog preview', exact: true}).click();
      await page.waitForFunction(() => window.textState().links === 1
        && !!document.querySelector('aside[aria-label="Blog preview"]:not([inert])')
        && !document.querySelector('.scene-link-hit:disabled'));
      assertPixelFrames(await samples(page), 'links', reduced, 'Focused-to-focused transition must dissolve');
    }
    await page.keyboard.press('Escape');
    await homeReady(page, mobile);
    await page.getByRole('button', {name: 'Open about preview', exact: true}).click();
    await page.getByRole('button', {name: 'Close about preview', exact: true}).waitFor();
    await page.waitForFunction((mobile) => window.textState().hero === 0
      && window.textState().links === (mobile ? 0 : 1), mobile);
    await page.keyboard.press('Escape');
    await homeReady(page, mobile);

    // Reverse an in-flight navigation, then use browser history to enter again.
    await page.getByRole('link', {name: 'Art', exact: true}).click();
    await page.waitForURL('**/artworks**');
    await page.getByRole('link', {name: 'SQYC', exact: true}).click();
    await homeReady(page, mobile);
    await page.goBack();
    await artReady(page);
    await page.goForward();
    await homeReady(page, mobile);

    // A fresh scene on an Art URL must never introduce homepage text.
    await page.goto(`${base}/artworks`, {waitUntil: 'domcontentloaded'});
    await artReady(page);
    assert((await samples(page)).every((s) => s.links === 0 && s.hero === 0 && s.decor === 0),
      'Cold Art entry must never flash scene text');
    assert.deepEqual(errors, [], 'No runtime or shader errors');
    results.push({name, passed: true, entryFrames: entry.length, returnFrames: returning.length, resourceWarnings});
    console.log(`PASS ${name}: first Art entry, return, previews, rapid reversal, history, direct entry`);
    await context.close();
  }
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({path: path.join(output, 'failure.png')}).catch(() => {});
    console.error(await currentPage.evaluate(() => ({path: location.pathname, state: window.textState?.()})));
  }
  throw error;
} finally {
  await writeFile(path.join(output, 'verification.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
