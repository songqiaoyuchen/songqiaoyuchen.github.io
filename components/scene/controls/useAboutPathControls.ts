// Leva "About Path" folder (dev only); Save Config writes every key to config/scene/aboutPath.ts.
import {useControls} from 'leva';
import {ABOUT_CHECKPOINTS, ABOUT_PATH_CONFIG} from '@/config/scene/aboutPath';

const pair = ([a, b]: readonly [number, number]): [number, number] => [a, b];
const CHECKPOINT = {step: 0.01, joystick: false} as const;

export function useAboutPathControls() {
  return useControls('About Path', {
    // AboutPath.tsx: world [x, z] of each checkpoint, oldest first; each snaps onto the ridge route.
    medic: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.medic), label: 'Medic'},
    nus: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.nus), label: 'NUS'},
    greyhats: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.greyhats), label: 'Greyhats'},
    sonicboom: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.sonicboom), label: 'Sonicboom'},
    uniplans: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.uniplans), label: 'Uniplans'},
    next: {...CHECKPOINT, value: pair(ABOUT_CHECKPOINTS.next), label: 'Next?'},
    // AboutPath.tsx -> CameraRig: screen point (NDC) a framed checkpoint moves toward, how far, and the zoom.
    focusScreen: {...CHECKPOINT, value: pair(ABOUT_PATH_CONFIG.focusScreen), label: 'Focus screen'},
    focusFollow: {value: ABOUT_PATH_CONFIG.focusFollow, min: 0, max: 1, step: 0.01, label: 'Focus follow'},
    focusZoom: {value: ABOUT_PATH_CONFIG.focusZoom, min: 0, max: 0.7, step: 0.01, label: 'Focus zoom'},
    // AboutPath.tsx + AboutCallouts.css: the route's signal colour (path, trail ahead, markers).
    trailColor: {value: ABOUT_PATH_CONFIG.trailColor, label: 'Trail colour'},
  }, {collapsed: true});
}
