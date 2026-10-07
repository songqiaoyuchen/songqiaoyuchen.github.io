// Leva "About Path" folder (dev only, About only); Save Config writes every key to config/scene/aboutPath.ts.
// AboutPathEditor.tsx adds its Edit route controls to the same folder.
import {levaStore, useControls} from 'leva';
import {ABOUT_CHECKPOINTS, ABOUT_PATH_CONFIG, type AboutCheckpointId, type PlanPoint} from '@/config/scene/aboutPath';
import {ABOUT_FOLDER} from './sectionScope';

export const ABOUT_PATH_FOLDER = 'About Path';

const pair = ([a, b]: PlanPoint): [number, number] => [a, b];
// Checkpoint positions are edited by sliding them along the route (AboutPathEditor.tsx), not as numbers.
const CHECKPOINT = {step: 0.01, joystick: false, render: () => false} as const;

export function useAboutPathControls() {
  return useControls(ABOUT_PATH_FOLDER, {
    // AboutPath.tsx: world [x, z] of each checkpoint, oldest first; each snaps onto the ridge route.
    medic: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.medic)},
    nus: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.nus)},
    greyhats: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.greyhats)},
    sonicboom: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.sonicboom)},
    uniplans: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.uniplans)},
    next: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.next)},
    // AboutPath.tsx: height of the path (and the editor's anchors) above the rendered terrain surface.
    lift: {value: ABOUT_PATH_CONFIG.lift, min: 0, max: 0.2, step: 0.005, label: 'Path lift'},
    // AboutPath.tsx -> CameraRig: screen point (NDC) a framed checkpoint moves toward, how far, and the zoom.
    focusScreen: {value: pair(ABOUT_PATH_CONFIG.focusScreen), step: 0.01, joystick: false, label: 'Focus screen'},
    focusFollow: {value: ABOUT_PATH_CONFIG.focusFollow, min: 0, max: 1, step: 0.01, label: 'Focus follow'},
    focusZoom: {value: ABOUT_PATH_CONFIG.focusZoom, min: 0, max: 0.7, step: 0.01, label: 'Focus zoom'},
    // CameraRig.tsx: journey time between the landscape and About, and between entries on the path.
    journeySeconds: {value: ABOUT_PATH_CONFIG.journeySeconds, min: 0.2, max: 8, step: 0.1, label: 'Journey (s)'},
    focusSeconds: {value: ABOUT_PATH_CONFIG.focusSeconds, min: 0.2, max: 6, step: 0.1, label: 'Focus (s)'},
    // AboutPath.tsx + AboutCallouts.css: the route's signal colour (path, trail ahead, markers).
    trailColor: {value: ABOUT_PATH_CONFIG.trailColor, label: 'Trail colour'},
  }, {collapsed: true, ...ABOUT_FOLDER});
}

/** Moves one checkpoint's input, as Edit route slides it along the path; Save Config then keeps it. */
export function setAboutCheckpoint(id: AboutCheckpointId, point: PlanPoint) {
  levaStore.set({[`${ABOUT_PATH_FOLDER}.${id}`]: pair(point)}, false);
}
