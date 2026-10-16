// The elevation map's builder on the main thread's side: owns the places worker (lib/scene/places.worker.ts), which
// decodes the map and builds its summary and the land's light points off the main thread, one answer per request
// id so a stale one is dropped by its caller; and runs the same build here, as the globe did before, where a
// worker cannot decode images (no OffscreenCanvas or createImageBitmap) or has failed.
import {flipRows, sampleLights, summarizeMap, type ElevationMapData} from './placesWorker';
import type {PlacesWorkerBuild, PlacesWorkerRequest, PlacesWorkerResponse} from './placesWorkerTypes';

export type ElevationBuild = PlacesWorkerBuild;

type Pending = {resolve: (build: ElevationBuild | null) => void; fallback: () => void};

// Undefined until the first build decides; null for the main-thread path.
let worker: Worker | null | undefined;
let nextRequestId = 1;
const pending = new Map<number, Pending>();

function canDecodeInWorker() {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
    && typeof createImageBitmap === 'function';
}

/** The worker is gone: every build waiting on it, and every later one, runs here. */
function failWorker() {
  worker?.terminate();
  worker = null;
  const waiting = [...pending.values()];
  pending.clear();
  waiting.forEach((request) => request.fallback());
}

function getWorker() {
  if (worker !== undefined) return worker;
  if (!canDecodeInWorker()) {
    worker = null;
    return null;
  }
  worker = new Worker(new URL('./places.worker.ts', import.meta.url), {name: 'places-maps', type: 'module'});
  worker.onmessage = (event: MessageEvent<PlacesWorkerResponse>) => {
    const response = event.data;
    const request = pending.get(response.requestId);
    if (!request) return;
    pending.delete(response.requestId);
    if (response.type === 'error') request.fallback();
    else request.resolve(response.build);
  };
  worker.onerror = () => failWorker();
  return worker;
}

// The main-thread path: the image decoded through a canvas, then the same build.
const decoded = new Map<string, Promise<ElevationMapData | null>>();

function decodeOnMainThread(src: string) {
  let map = decoded.get(src);
  if (!map) {
    map = new Promise<ElevationMapData | null>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0);
        const {data, width, height} = context.getImageData(0, 0, canvas.width, canvas.height);
        const heights = new Uint8Array(width * height);
        for (let index = 0; index < heights.length; index++) heights[index] = data[index * 4];
        resolve({width, height, heights});
      };
      image.onerror = () => resolve(null);
      image.src = src;
    });
    decoded.set(src, map);
  }
  return map;
}

async function buildOnMainThread(
  src: string, summaryBlur: number, density: number, withMap: boolean,
): Promise<ElevationBuild | null> {
  const map = await decodeOnMainThread(src);
  if (!map) return null;
  const {width, height, heights} = map;
  const summary = summarizeMap(map, summaryBlur);
  return {
    map: withMap ? {width, height, heights, heightTexels: flipRows(heights, width, height)} : null,
    summary,
    summaryTexels: flipRows(summary, width, height),
    lights: sampleLights(map, summary, density),
  };
}

/**
 * The map's summary for `summaryBlur` texels and the light points for `density`, with the decoded map itself when
 * `withMap` (the caller keeps it after the first build); null when the file is missing.
 */
export function buildElevation(src: string, summaryBlur: number, density: number, withMap: boolean) {
  const target = getWorker();
  if (!target) return buildOnMainThread(src, summaryBlur, density, withMap);
  const requestId = nextRequestId++;
  return new Promise<ElevationBuild | null>((resolve, reject) => {
    pending.set(requestId, {
      resolve,
      fallback: () => {
        buildOnMainThread(src, summaryBlur, density, withMap).then(resolve, reject);
      },
    });
    const request: PlacesWorkerRequest = {type: 'build', src, summaryBlur, density, withMap, requestId};
    target.postMessage(request);
  });
}
