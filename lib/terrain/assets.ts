// Terrain asset pipeline on the main thread: owns the worker, exposes baked textures as suspense hooks.
'use client';

import {use} from 'react';
import {
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  RedFormat,
  RGFormat,
} from 'three';
import type {HeightGrid} from './bake';
import {
  getContourBuildKey,
  getContourBuildOptions,
} from './contourOptions';
import type {ContourTubeBuffers} from './lineTubeBuffers';
import type {ReachOptions} from './reach';
import type {
  ContourBuildOptions,
  TerrainWorkerResponse,
} from './workerTypes';

export type TerrainAssets = {
  displacementMap: DataTexture;
  gradientMap: DataTexture | null;
  shellBase: HeightGrid;
  staticLightingMap: DataTexture;
};

type ContourRequest = {
  reject: (error: Error) => void;
  resolve: (buffers: ContourTubeBuffers) => void;
};

type GradientRequest = {
  reject: (error: Error) => void;
  resolve: (texture: DataTexture) => void;
};

/** The intro reveal's reach field (lib/terrain/reach.ts) as a texture of distances over `max`, plus the summit. */
export type TerrainReach = {
  texture: DataTexture;
  max: number;
  origin: [number, number];
};

type ReachRequest = {
  reject: (error: Error) => void;
  resolve: (reach: TerrainReach) => void;
};

let assetsPromise: Promise<TerrainAssets> | null = null;
let initialContoursPromise: Promise<ContourTubeBuffers> | null = null;
let initialContoursReject: ((error: Error) => void) | null = null;
let initialContoursResolve: ((buffers: ContourTubeBuffers) => void) | null = null;
let loadReject: ((error: Error) => void) | null = null;
let terrainWorker: Worker | null = null;
let disposalTimer: number | null = null;
let nextRequestId = 1;
const contourRequests = new Map<number, ContourRequest>();
let gradientPromise: Promise<DataTexture> | null = null;
const gradientRequests = new Map<number, GradientRequest>();
const reachRequests = new Map<number, ReachRequest>();
const reachPromises = new Map<string, Promise<TerrainReach>>();

function configureTexture(texture: DataTexture) {
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function makeWorker() {
  if (terrainWorker) return terrainWorker;
  terrainWorker = new Worker(new URL('./terrain.worker.ts', import.meta.url), {
    name: 'terrain-preparation',
    type: 'module',
  });
  return terrainWorker;
}

function rejectAll(error: Error) {
  loadReject?.(error);
  loadReject = null;
  initialContoursReject?.(error);
  initialContoursReject = null;
  initialContoursResolve = null;
  for (const request of contourRequests.values()) request.reject(error);
  contourRequests.clear();
  for (const request of gradientRequests.values()) request.reject(error);
  gradientRequests.clear();
  for (const request of reachRequests.values()) request.reject(error);
  reachRequests.clear();
  reachPromises.clear();
}

function loadTerrainAssets() {
  if (assetsPromise) return assetsPromise;
  const worker = makeWorker();

  initialContoursPromise = new Promise<ContourTubeBuffers>((resolve, reject) => {
    initialContoursResolve = resolve;
    initialContoursReject = reject;
  });

  assetsPromise = new Promise<TerrainAssets>((resolve, reject) => {
    loadReject = reject;
    worker.onmessage = (event: MessageEvent<TerrainWorkerResponse>) => {
      const response = event.data;
      if (response.type === 'progress') return;
      if (response.type === 'error') {
        const error = new Error(response.message);
        if (response.requestId === undefined) rejectAll(error);
        else {
          contourRequests.get(response.requestId)?.reject(error);
          contourRequests.delete(response.requestId);
          if (gradientRequests.has(response.requestId)) gradientPromise = null;
          gradientRequests.get(response.requestId)?.reject(error);
          gradientRequests.delete(response.requestId);
          reachRequests.get(response.requestId)?.reject(error);
          reachRequests.delete(response.requestId);
        }
        return;
      }
      if (response.type === 'reach-ready') {
        const {field} = response;
        // Distances as a share of the largest, in half floats (filterable, like the other terrain maps).
        const halves = new Uint16Array(field.data.length);
        const scale = field.max > 0 ? 1 / field.max : 0;
        for (let index = 0; index < halves.length; index++) {
          halves[index] = DataUtils.toHalfFloat(Math.min(1, field.data[index] * scale));
        }
        const texture = configureTexture(new DataTexture(halves, field.width, field.height, RedFormat, HalfFloatType));
        texture.name = 'Terrain.Reach';
        reachRequests.get(response.requestId)?.resolve({texture, max: field.max, origin: field.origin});
        reachRequests.delete(response.requestId);
        return;
      }
      if (response.type === 'contours-ready') {
        contourRequests.get(response.requestId)?.resolve(response.buffers);
        contourRequests.delete(response.requestId);
        return;
      }
      if (response.type === 'initial-contours-ready') {
        initialContoursResolve?.(response.buffers);
        initialContoursResolve = null;
        initialContoursReject = null;
        return;
      }
      if (response.type === 'gradient-ready') {
        const gradientMap = configureTexture(new DataTexture(
          response.gradient.data,
          response.gradient.width,
          response.gradient.height,
          RGFormat,
          HalfFloatType,
        ));
        gradientMap.name = 'Terrain.Gradient';
        gradientRequests.get(response.requestId)?.resolve(gradientMap);
        gradientRequests.delete(response.requestId);
        return;
      }

      loadReject = null;
      const {assets} = response;
      const displacementMap = configureTexture(new DataTexture(
        assets.displacement.data,
        assets.displacement.width,
        assets.displacement.height,
        RedFormat,
        HalfFloatType,
      ));
      displacementMap.name = 'Terrain.Displacement';
      const staticLightingMap = configureTexture(new DataTexture(
        assets.staticLighting.data,
        assets.staticLighting.width,
        assets.staticLighting.height,
        RGFormat,
        HalfFloatType,
      ));
      staticLightingMap.name = 'Terrain.StaticLighting';
      resolve({
        displacementMap,
        gradientMap: null,
        shellBase: assets.shellBase,
        staticLightingMap,
      });
    };
    worker.onerror = (event) => rejectAll(new Error(
      event.message || 'Terrain preparation worker failed.',
    ));
    worker.postMessage({type: 'load'});
  });
  return assetsPromise;
}

export function useTerrainContourBuffers() {
  loadTerrainAssets();
  if (!initialContoursPromise) {
    throw new Error('Terrain contour preparation did not start.');
  }
  return {
    buffers: use(initialContoursPromise),
    key: getContourBuildKey(getContourBuildOptions()),
  };
}

export function requestContourBuffers(contourOptions: ContourBuildOptions) {
  const worker = makeWorker();
  const requestId = nextRequestId++;
  return new Promise<ContourTubeBuffers>((resolve, reject) => {
    contourRequests.set(requestId, {reject, resolve});
    worker.postMessage({contourOptions, requestId, type: 'contours'});
  });
}

export function requestTerrainGradient() {
  if (gradientPromise) return gradientPromise;
  const worker = makeWorker();
  const requestId = nextRequestId++;
  gradientPromise = new Promise<DataTexture>((resolve, reject) => {
    gradientRequests.set(requestId, {reject, resolve});
    worker.postMessage({requestId, type: 'gradient'});
  });
  return gradientPromise;
}

/** The reach field for these options, built once by the worker (the shell must have loaded). */
export function requestTerrainReach(reachOptions: ReachOptions) {
  const key = JSON.stringify(reachOptions);
  const cached = reachPromises.get(key);
  if (cached) return cached;
  const worker = makeWorker();
  const requestId = nextRequestId++;
  const promise = new Promise<TerrainReach>((resolve, reject) => {
    reachRequests.set(requestId, {reject, resolve});
    worker.postMessage({reachOptions, requestId, type: 'reach'});
  });
  reachPromises.set(key, promise);
  return promise;
}

export function disposeTerrainPipeline() {
  const error = new Error('Terrain preparation was cancelled.');
  rejectAll(error);
  terrainWorker?.postMessage({type: 'cancel'});
  terrainWorker?.terminate();
  terrainWorker = null;
  assetsPromise = null;
  initialContoursPromise = null;
  gradientPromise = null;
}

export function retainTerrainPipeline() {
  if (disposalTimer === null) return;
  window.clearTimeout(disposalTimer);
  disposalTimer = null;
}

export function scheduleTerrainPipelineDisposal() {
  if (disposalTimer !== null) return;
  disposalTimer = window.setTimeout(() => {
    disposalTimer = null;
    disposeTerrainPipeline();
  }, 0);
}

export function useTerrainAssets() {
  return use(loadTerrainAssets());
}
