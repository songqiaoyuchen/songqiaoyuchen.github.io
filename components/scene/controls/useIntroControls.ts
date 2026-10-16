// Leva "Intro" folder (dev only, hidden on About and Places): the homepage intro's descent from the map pose above
// the summit. Save Config writes every key to config/scene/intro.ts. The wave that draws the map is tuned in
// Contour Lines › Reveal, whose Replay button replays the whole intro, descent included.
import {useControls} from 'leva';
import {INTRO_CONFIG} from '@/config/scene';
import {HOME_SCENE_FOLDER} from './sectionScope';

const INTRO = INTRO_CONFIG;

export function useIntroControls() {
  return useControls('Intro', {
    // CameraRig: camera height above the summit at the map pose.
    mapHeight: {value: INTRO.mapHeight, min: 8, max: 60, step: 0.5, label: 'Map Height'},
    phoneMapHeight: {value: INTRO.phoneMapHeight, min: 8, max: 80, step: 0.5, label: 'Phone Map Height'},
    // CameraRig: lean back from vertical along the overview's heading, so the map is the right way up.
    mapTilt: {value: INTRO.mapTilt, min: 0, max: 15, step: 0.5, label: 'Map Tilt'},
    // CameraRig: seconds into the reveal before the camera sets off.
    descentDelay: {value: INTRO.descentDelay, min: 0, max: 6, step: 0.1, label: 'Descent Delay'},
    // SceneFog: fog distances at the map pose as a multiple of the overview's.
    mapFogScale: {value: INTRO.mapFogScale, min: 1, max: 8, step: 0.1, label: 'Map Fog Scale'},
    // TerrainMesh: the span of the descent over which the ground's light comes on.
    lightsIn: {value: [...INTRO.lightsIn] as [number, number], min: 0, max: 1, step: 0.05, joystick: false,
      label: 'Lights In'},
    // Contours: minimum on-screen tube radius at the map pose.
    mapMinPixels: {value: INTRO.mapMinPixels, min: 0, max: 3, step: 0.05, label: 'Map Min Pixels'},
  }, HOME_SCENE_FOLDER);
}
