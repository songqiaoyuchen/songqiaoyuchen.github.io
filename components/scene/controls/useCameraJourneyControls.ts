// Leva "Camera Journeys" folder (dev only, every section): how long each camera journey takes. Save Config writes
// every key to CAMERA_JOURNEY_CONFIG in config/scene/camera.ts. Art's journey is tuned in the Art panel's
// Art Transition, beside the wipe and fog it must match.
import {useControls} from 'leva';
import {CAMERA_JOURNEY_CONFIG} from '@/config/scene/camera';

const SECONDS = {min: 0.2, max: 8, step: 0.05} as const;
const J = CAMERA_JOURNEY_CONFIG;

export function useCameraJourneyControls() {
  // CameraRig.tsx: duration per journey kind (lib/scene/cameraJourney.ts legKind).
  return useControls('Camera Journeys', {
    default: {...SECONDS, value: J.default, label: 'Sections (s)'},
    aboutEntry: {...SECONDS, value: J.aboutEntry, label: 'About in/out (s)'},
    aboutFocus: {...SECONDS, value: J.aboutFocus, label: 'About entries (s)'},
    placesEntry: {...SECONDS, value: J.placesEntry, label: 'Places in/out (s)'},
    // Also PlacesGlobe.tsx: the globe turns to the location over it.
    placesFocus: {...SECONDS, value: J.placesFocus, label: 'Places location (s)'},
    placesIndex: {...SECONDS, value: J.placesIndex, label: 'Phone location list (s)'},
  }, {collapsed: true});
}
