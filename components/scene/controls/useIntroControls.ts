// Leva "Intro" folder (dev only, hidden on About and Places): the homepage intro's contour map and the reveal
// (components/home/preloader/IntroInk.tsx), read live by the preloader. Save Config writes every key to
// config/scene/intro.ts. The terrain's own wave is tuned in Contour Lines › Reveal, whose Replay button replays
// it; the intro itself plays once per load (reload with #preview=1 to watch it again).
import {useControls} from 'leva';
import {INTRO_CONFIG} from '@/config/scene';
import {HOME_SCENE_FOLDER} from './sectionScope';

const INTRO = INTRO_CONFIG;

export function useIntroControls() {
  return useControls('Intro', {
    lineSpacing: {value: INTRO.lineSpacing, min: 8, max: 60, step: 1, label: 'Line Spacing (px)'},
    mapRelief: {value: INTRO.mapRelief, min: 0, max: 2, step: 0.05, label: 'Map Relief'},
    mapSeconds: {value: INTRO.mapSeconds, min: 0.2, max: 8, step: 0.05, label: 'Map (s)'},
    mapHold: {value: INTRO.mapHold, min: 0, max: 4, step: 0.05, label: 'Map Hold (s)'},
    revealSeconds: {value: INTRO.revealSeconds, min: 0.1, max: 6, step: 0.05, label: 'Reveal (s)'},
    fadeSeconds: {value: INTRO.fadeSeconds, min: 0.1, max: 3, step: 0.05, label: 'Fade (s)'},
  }, HOME_SCENE_FOLDER);
}
