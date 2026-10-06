// Terrain web worker: downloads and decompresses baked artifacts, rebuilds contours on request.
import {loadTerrainManifest, type TerrainArtifact} from './manifest';
import {extractIsolines} from './isolines';
import {unpackContourTubeBuffers} from './contourArtifact';
import {
  buildContourTubeBuffers,
  getContourTubeTransferables,
} from './lineTubeBuffers';
import {bakeShellGrid} from './shell';
import type {
  ContourBuildOptions,
  TerrainWorkerRequest,
  TerrainWorkerResponse,
} from './workerTypes';

type WorkerPort = {
  close: () => void;
  onmessage: ((event: MessageEvent<TerrainWorkerRequest>) => void) | null;
  postMessage: (message: TerrainWorkerResponse, transfer?: Transferable[]) => void;
};

const port = self as unknown as WorkerPort;
let abortController = new AbortController();
let shellBase: {data: Float32Array; height: number; width: number} | null = null;

function reportProgress(progress: number) {
  port.postMessage({progress, type: 'progress'});
}

async function decompressArtifact(artifact: Pick<TerrainArtifact, 'byteLength' | 'file'>) {
  const response = await fetch(`/textures/terrain/baked/${artifact.file}`, {
    cache: 'force-cache',
    signal: abortController.signal,
  });
  if (!response.ok) {
    throw new Error(`Unable to load terrain artifact ${artifact.file} (${response.status}).`);
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress the terrain assets.');
  }
  const stream = response.body?.pipeThrough(new DecompressionStream('gzip'));
  if (!stream) throw new Error(`Terrain artifact ${artifact.file} returned no body.`);
  const buffer = await new Response(stream).arrayBuffer();
  if (buffer.byteLength !== artifact.byteLength) {
    throw new Error(`Terrain artifact ${artifact.file} has an invalid byte length.`);
  }
  return buffer;
}

function buildContours(options: ContourBuildOptions) {
  if (!shellBase) throw new Error('Terrain shell is not ready.');
  const smoothedShell = bakeShellGrid(
    shellBase,
    options.smoothIterations,
    options.smoothFactor,
  );
  return buildContourTubeBuffers(extractIsolines(smoothedShell, options));
}

async function loadAssets() {
  abortController = new AbortController();
  const manifest = await loadTerrainManifest();
  reportProgress(0.24);

  const displacementBuffer = await decompressArtifact(manifest.artifacts.displacement);
  reportProgress(0.34);
  const shellBuffer = await decompressArtifact(manifest.artifacts.shell);
  shellBase = {
    data: new Float32Array(shellBuffer),
    height: manifest.artifacts.shell.height,
    width: manifest.artifacts.shell.width,
  };
  reportProgress(0.46);
  const lightingBuffer = await decompressArtifact(manifest.artifacts.staticLighting);
  reportProgress(0.56);
  const displacement = {
    ...manifest.artifacts.displacement,
    data: new Uint16Array(displacementBuffer),
  };
  const staticLighting = {
    ...manifest.artifacts.staticLighting,
    data: new Uint16Array(lightingBuffer),
  };
  const response: TerrainWorkerResponse = {
    assets: {
      displacement,
      shellBase: {
        data: Float32Array.from(shellBase.data),
        height: shellBase.height,
        width: shellBase.width,
      },
      staticLighting,
    },
    type: 'ready',
  };
  const transferables = [
    displacement.data.buffer,
    response.assets.shellBase.data.buffer,
    staticLighting.data.buffer,
  ];
  port.postMessage(response, transferables);

  const contourBuffer = await decompressArtifact(manifest.artifacts.contours);
  const contourBuffers = unpackContourTubeBuffers(
    contourBuffer,
    manifest.artifacts.contours.buffers,
  );
  reportProgress(0.78);
  port.postMessage(
    {buffers: contourBuffers, type: 'initial-contours-ready'},
    getContourTubeTransferables(contourBuffers),
  );
}

port.onmessage = (event) => {
  const request = event.data;
  if (request.type === 'cancel') {
    abortController.abort();
    port.close();
    return;
  }

  if (request.type === 'load') {
    void loadAssets().catch((error: unknown) => {
      if (abortController.signal.aborted) return;
      port.postMessage({
        message: error instanceof Error ? error.message : 'Terrain worker failed.',
        type: 'error',
      });
    });
    return;
  }

  if (request.type === 'gradient') {
    void loadTerrainManifest().then(async (manifest) => {
      const buffer = await decompressArtifact(manifest.artifacts.gradient);
      const gradient = {
        ...manifest.artifacts.gradient,
        data: new Uint16Array(buffer),
      };
      port.postMessage(
        {gradient, requestId: request.requestId, type: 'gradient-ready'},
        [gradient.data.buffer],
      );
    }).catch((error: unknown) => {
      port.postMessage({
        message: error instanceof Error ? error.message : 'Gradient loading failed.',
        requestId: request.requestId,
        type: 'error',
      });
    });
    return;
  }

  try {
    const buffers = buildContours(request.contourOptions);
    port.postMessage(
      {buffers, requestId: request.requestId, type: 'contours-ready'},
      getContourTubeTransferables(buffers),
    );
  } catch (error) {
    port.postMessage({
      message: error instanceof Error ? error.message : 'Contour rebuild failed.',
      requestId: request.requestId,
      type: 'error',
    });
  }
};
