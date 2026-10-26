// The lake dive's shared state: the flow's stages, the player's input (written by the HUD, read by the dive every
// frame) and the dive's telemetry (written by the dive every frame, read by the HUD), both as plain mutable objects
// so neither side re-renders React to talk to the other; and what the browser remembers of a finished dive.

export type LakeState =
  | 'idle' // the overview; the lake lies on the terrain
  | 'entering' // the camera flies down to the water, the veil darkens
  | 'diving' // in the crack
  | 'found' // the bottle in reach; the letter opens
  | 'surfacing' // the veil darkens over the crack
  | 'returning'; // the camera flies back up to the overview

/** The crack is on screen (the home scene hidden). */
export function isUnderwater(state: LakeState) {
  return state === 'diving' || state === 'found' || state === 'surfacing';
}

export type LakeInput = {
  /** -1..1, left to right. */
  yaw: number;
  /** -1..1, down to up. */
  pitch: number;
  /** A ping asked for; the dive clears it. */
  ping: boolean;
  /** A jump to the chamber asked for (after a finished dive); the dive clears it. */
  skip: boolean;
};

export type LakeTelemetry = {
  /** Metres to the wall on each side as the readouts show them (counting up with the ping's front). */
  left: number;
  right: number;
  /** 0..1: how fresh each readout is (bright while counting, dim once stale). */
  leftFresh: number;
  rightFresh: number;
  /** -1 until the first ping. */
  measured: number;
  /** Metres below the surface. */
  depth: number;
  /** Metres per second. */
  speed: number;
  /** 0..1: a ping is being sent. */
  scanning: number;
  /** 0..1: the craft just brushed a wall. */
  bump: number;
  /** 0..1: the sonar's readiness; 1 is ready to ping. */
  cooldown: number;
  /** 0..1: the share of the route behind the craft. */
  progress: number;
};

export function createLakeInput(): LakeInput {
  return {yaw: 0, pitch: 0, ping: false, skip: false};
}

export function createLakeTelemetry(): LakeTelemetry {
  return {
    left: 0, right: 0, leftFresh: 0, rightFresh: 0, measured: -1, depth: 0, speed: 0, scanning: 0, bump: 0,
    cooldown: 1, progress: 0,
  };
}

const STORAGE_KEY = 'sqyc:lake';
const completedListeners = new Set<() => void>();
// Storage is read only once the page has mounted, so the first client render matches the server's (not found).
let lakeHydrated = false;

/** Whether this browser has reached the bottle before (false until the page has mounted). */
export function readLakeCompleted() {
  if (!lakeHydrated) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'found';
  } catch {
    return false;
  }
}

/** Called once the page has mounted: storage may be read from now on. */
export function markLakeHydrated() {
  if (lakeHydrated) return;
  lakeHydrated = true;
  for (const listener of completedListeners) listener();
}

export function writeLakeCompleted() {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'found');
  } catch {
    // Storage may be unavailable; the dive still works, it is only not remembered.
  }
  for (const listener of completedListeners) listener();
}

/** For useSyncExternalStore: notified when this page writes the completion. */
export function subscribeLakeCompleted(listener: () => void) {
  completedListeners.add(listener);
  return () => {
    completedListeners.delete(listener);
  };
}
