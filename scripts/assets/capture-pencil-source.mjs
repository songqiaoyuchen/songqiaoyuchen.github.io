// Capture the unstyled terrain at the settled Art pose for image authoring.
// Uses the external Playwright setup documented in architecture.md.
import {mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve('tmp/pencil-overlay');
await mkdir(output, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({viewport: {width: 2048, height: 1024}, deviceScaleFactor: 1});
  page.on('pageerror', (error) => console.error(error.stack));
  page.on('console', (message) => { if (message.type() === 'error') console.error(message.text()); });
  await page.addInitScript(() => {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, renderers: new Map(),
      inject(renderer) { const id = this.renderers.size + 1; this.renderers.set(id, renderer); return id; },
      onCommitFiberRoot: (_id, root) => {
        if (root.containerInfo?.getState?.().camera) window.terrainStore = root.containerInfo;
      },
      onCommitFiberUnmount: () => {}, checkDCE: () => {},
    };
  });
  await page.goto(`${process.env.ART_BASE_URL || 'http://localhost:3000'}/artworks`, {waitUntil: 'networkidle'});
  console.log(await page.evaluate(() => ({title: document.title, store: !!window.terrainStore,
    arriving: document.querySelector('[data-art-arriving]')?.getAttribute('data-art-arriving'),
    canvas: !!document.querySelector('canvas'), status: document.querySelector('.art-scene-status')?.textContent})));
  await page.waitForFunction(() => window.terrainStore
    && document.querySelector('[data-art-arriving="false"]')
    && !document.querySelector('.art-scene-status'), undefined, {timeout: 90000});
  const cameraInfo = await page.evaluate(() => {
    const {scene, camera} = window.terrainStore.getState();
    let composite;
    scene.traverse((object) => {
      if (object.material?.uniforms?.uArtOpacity) composite = object;
    });
    if (!composite) throw new Error('Terrain composite not ready');
    composite.onBeforeRender = () => { composite.material.uniforms.uArtOpacity.value = 0; };
    return {position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
      fov: camera.fov, aspect: camera.aspect};
  });
  await page.addStyleTag({content: 'body * {visibility:hidden !important} canvas[data-engine] {visibility:visible !important}'});
  await page.waitForTimeout(1500);
  await page.locator('canvas[data-engine]').screenshot({path: path.join(output, 'terrain-source.png')});
  await writeFile(path.join(output, 'camera.json'), JSON.stringify(cameraInfo, null, 2));
  console.log(JSON.stringify(cameraInfo));
} finally {
  await browser.close();
}
