// Message and payload types exchanged between lib/terrain/assets.ts and the terrain worker.
import type {HeightGrid} from './bake';
import type {IsolineOptions} from './isolines';
import type {ContourTubeBuffers} from './lineTubeBuffers';
import type {TerrainArtifact} from './manifest';
import type {ReachField, ReachOptions} from './reach';

export type ContourBuildOptions = IsolineOptions & {
  smoothFactor: number;
  smoothIterations: number;
};

export type TerrainWorkerAssets = {
  displacement: TerrainArtifact & {data: Uint16Array};
  shellBase: HeightGrid;
  staticLighting: TerrainArtifact & {data: Uint16Array};
};

export type TerrainWorkerRequest =
  | {
    type: 'load';
  }
  | {
    contourOptions: ContourBuildOptions;
    requestId: number;
    type: 'contours';
  }
  | {requestId: number; type: 'gradient'}
  | {reachOptions: ReachOptions; requestId: number; type: 'reach'}
  | {type: 'cancel'};

export type TerrainWorkerResponse =
  | {progress: number; type: 'progress'}
  | {assets: TerrainWorkerAssets; type: 'ready'}
  | {buffers: ContourTubeBuffers; type: 'initial-contours-ready'}
  | {
    buffers: ContourTubeBuffers;
    requestId: number;
    type: 'contours-ready';
  }
  | {
    gradient: TerrainArtifact & {data: Uint16Array};
    requestId: number;
    type: 'gradient-ready';
  }
  | {field: ReachField; requestId: number; type: 'reach-ready'}
  | {message: string; requestId?: number; type: 'error'};
