// Messages between lib/scene/travelElevation.ts and the travel worker (lib/scene/travel.worker.ts).
import type {ElevationMapData, LightBuffers} from './travelWorker';

export type TravelWorkerRequest =
  | {
    type: 'build';
    src: string;
    summaryBlur: number;
    density: number;
    /** Whether to send the decoded map along (its first build; later ones reuse it). */
    withMap: boolean;
    requestId: number;
  }
  | {type: 'cancel'};

/** Everything the globe reads from the elevation map: the map (when asked for) with its rows flipped for a
 * texture, the summary for the blur radius, likewise, and the light points for the density. */
export type TravelWorkerBuild = {
  map: (ElevationMapData & {heightTexels: Uint8Array}) | null;
  summary: Uint8Array;
  summaryTexels: Uint8Array;
  lights: LightBuffers;
};

export type TravelWorkerResponse =
  | {
    /** Null when the map is missing or not an image: the globe stays smooth. */
    build: TravelWorkerBuild | null;
    requestId: number;
    type: 'built';
  }
  | {message: string; requestId: number; type: 'error'};
