// Leva "Config > Save Camera" button (dev only): stores the orbit camera as the current section's pose.
import {useThree} from '@react-three/fiber';
import {button, useControls} from 'leva';
import {useEffect, useRef, type MutableRefObject} from 'react';
import type {OrbitControls as OrbitControlsInstance} from 'three-stdlib';
import {usePlacesScene} from '@/components/places/PlacesSceneContext';
import {SCENE_LAYOUT_CONFIG} from '@/config/scene';
import {locationTurnKey} from '@/config/scene/places';
import type {SectionId} from '@/data/sections';
import {postConfigValues} from './saveConfig';

const round3 = (value: number) => Math.round(value * 1000) / 1000;

function toTuple(vector: {x: number; y: number; z: number}): [number, number, number] {
  return [round3(vector.x), round3(vector.y), round3(vector.z)];
}

/**
 * Leva button: writes the current camera position and look-at point into the active pose in
 * config/scene/camera.ts via `camera.`-scoped keys. The field of view is derived from the viewport and stays.
 */
export function SaveCameraButton({
  activeId,
  readPlacesTurn,
  controlsRef,
}: {
  activeId: SectionId | null;
  /** Reads the globe's own turn with a location open (PlacesGlobe), degrees of yaw and pitch; saved as that
   * location's turn for the pose (PLACES_LOCATION_TURNS). */
  readPlacesTurn?: MutableRefObject<(() => [number, number] | null) | null>;
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
}) {
  const {camera, size} = useThree();
  // A location open on Places: the pose saved is the location framing; on phones the list pulled up has its own too.
  const {selectedId, indexOpen} = usePlacesScene();
  const placesSelected = selectedId !== null;
  // Leva registers the button once, so its click handler reads the section and viewport through a ref.
  const latest = useRef({activeId, placesSelected, selectedId, indexOpen, width: size.width});
  useEffect(() => {
    latest.current = {activeId, placesSelected, selectedId, indexOpen, width: size.width};
  });

  useControls('Config', {
    // config/scene/camera.ts: saves position, look-at and fov for the pose on screen (CameraRig.tsx).
    // The refs are read only when the user clicks the button.
    // eslint-disable-next-line react-hooks/refs
    'Save Camera': button(() => {
      const {activeId: section, placesSelected: location, selectedId: locationId, indexOpen: index, width}
        = latest.current;
      // Phones have their own overview, About and Places poses (all locations, the list pulled up, a location); other
      // sections keep the overview camera there. On desktop an open location has its own pose.
      const placesPose = location ? 'PlacesLocation' : 'Places';
      const phonePose = section === 'about' ? 'mobileAbout' : 'mobileOverview';
      const phoneLayout = width < (section === 'places'
        ? SCENE_LAYOUT_CONFIG.placesMobileMaxWidth : SCENE_LAYOUT_CONFIG.mobileMaxWidth);
      const pose = phoneLayout
        ? section === 'places' ? `mobile${!location && index ? 'PlacesIndex' : placesPose}` : phonePose
        : section === 'places' && location ? 'placesLocation' : section ?? 'overview';
      const values: Record<string, unknown> = {
        [`camera.${pose}Position`]: toTuple(camera.position),
      };
      const target = controlsRef.current?.target;
      if (target) values[`camera.${pose}LookAt`] = toTuple(target);
      // With a location open, the globe's turn as it stands (by hand, or held at the shared point) is kept as that
      // location's own for this pose, so it alone opens this way from now on.
      const phone = pose === 'mobilePlacesLocation';
      const turn = locationId && (pose === 'placesLocation' || phone) ? readPlacesTurn?.current?.() : null;
      if (turn && locationId) {
        values[`placesLocationTurns.${locationTurnKey(locationId, phone)}`] = [round3(turn[0]), round3(turn[1])];
      }
      void postConfigValues('Save Camera', values);
    }),
  });

  return null;
}
