// Travel worker: decodes the elevation map (public/travel/elevation.png) off the main thread and builds, on request,
// what the globe reads from it: the map's bytes for its texture, its summary for a blur radius and the land's light
// points for a density (lib/scene/travelWorker.ts). The decoded map and the last summary are kept for later requests
// (Leva retuning the blur or the density).
import {
  flipRows, lightTransferables, sampleLights, summarizeMap, type ElevationMapData,
} from './travelWorker';
import type {TravelWorkerBuild, TravelWorkerRequest, TravelWorkerResponse} from './travelWorkerTypes';

type WorkerPort = {
  close: () => void;
  onmessage: ((event: MessageEvent<TravelWorkerRequest>) => void) | null;
  postMessage: (message: TravelWorkerResponse, transfer?: Transferable[]) => void;
};

const port = self as unknown as WorkerPort;
const maps = new Map<string, Promise<ElevationMapData | null>>();
let lastSummary: {src: string; blur: number; summary: Uint8Array} | null = null;

/** The map's red channel, rows top-down as in the image; null when the file is missing. */
async function decode(src: string): Promise<ElevationMapData | null> {
  const response = await fetch(src);
  if (!response.ok) return null;
  // The bytes as the image holds them, as WebGL uploaded the image before (no colour conversion).
  const bitmap = await createImageBitmap(
    await response.blob(), {colorSpaceConversion: 'none', premultiplyAlpha: 'none'});
  const {width, height} = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context) {
    bitmap.close();
    throw new Error('No 2D context for the elevation map.');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const {data} = context.getImageData(0, 0, width, height);
  const heights = new Uint8Array(width * height);
  for (let index = 0; index < heights.length; index++) heights[index] = data[index * 4];
  return {width, height, heights};
}

function mapOf(src: string) {
  let map = maps.get(src);
  if (!map) {
    map = decode(src);
    maps.set(src, map);
  }
  return map;
}

function summaryOf(src: string, map: ElevationMapData, blur: number) {
  if (lastSummary && lastSummary.src === src && lastSummary.blur === blur) return lastSummary.summary;
  const summary = summarizeMap(map, blur);
  lastSummary = {src, blur, summary};
  return summary;
}

async function build(request: Extract<TravelWorkerRequest, {type: 'build'}>) {
  const {src, summaryBlur, density, withMap, requestId} = request;
  const map = await mapOf(src);
  if (!map) {
    port.postMessage({build: null, requestId, type: 'built'});
    return;
  }
  const {width, height} = map;
  const summary = summaryOf(src, map, summaryBlur);
  const lights = sampleLights(map, summary, density);
  // Copies go out, so the kept map and summary serve the next request.
  const built: TravelWorkerBuild = {
    map: withMap ? {width, height, heights: map.heights.slice(), heightTexels: flipRows(map.heights, width, height)}
      : null,
    summary: summary.slice(),
    summaryTexels: flipRows(summary, width, height),
    lights,
  };
  const transfer = [built.summary.buffer, built.summaryTexels.buffer, ...lightTransferables(lights)];
  if (built.map) transfer.push(built.map.heights.buffer, built.map.heightTexels.buffer);
  port.postMessage({build: built, requestId, type: 'built'}, transfer);
}

port.onmessage = (event) => {
  const request = event.data;
  if (request.type === 'cancel') {
    port.close();
    return;
  }
  void build(request).catch((error: unknown) => {
    port.postMessage({
      message: error instanceof Error ? error.message : 'Travel map build failed.',
      requestId: request.requestId,
      type: 'error',
    });
  });
};
