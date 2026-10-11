// Leva "Config > Save Camera" button (dev only): stores the orbit camera as the current section's pose.
import {useThree} from '@react-three/fiber';
import {button, levaStore, useControls} from 'leva';
import {useEffect, useRef, type MutableRefObject} from 'react';
import type {OrbitControls as OrbitControlsInstance} from 'three-stdlib';
import {useTravelScene} from '@/components/travel/TravelSceneContext';
import {SCENE_LAYOUT_CONFIG} from '@/config/scene';
import type {SectionId} from '@/data/sections';
import {postConfigValues} from './saveConfig';
import {TRAVEL_TRIP_FOLDER_NAME} from './useTravelControls';

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
  measureTravelOffset,
  controlsRef,
}: {
  activeId: SectionId | null;
  /** Reads the open trip's marker offset as drawn (TravelGlobe); saved with the trip pose for every trip. */
  measureTravelOffset?: MutableRefObject<(() => [number, number] | null) | null>;
  controlsRef: React.RefObject<OrbitControlsInstance | null>;
}) {
  const {camera, size} = useThree();
  // A trip open on Travel: the pose saved is the trip framing; on phones the list pulled up has its own too.
  const {selectedId, indexOpen} = useTravelScene();
  const travelSelected = selectedId !== null;
  // Leva registers the button once, so its click handler reads the section and viewport through a ref.
  const latest = useRef({activeId, travelSelected, indexOpen, width: size.width});
  useEffect(() => {
    latest.current = {activeId, travelSelected, indexOpen, width: size.width};
  });

  useControls('Config', {
    // config/scene/camera.ts: saves position, look-at and fov for the pose on screen (CameraRig.tsx).
    // The refs are read only when the user clicks the button.
    // eslint-disable-next-line react-hooks/refs
    'Save Camera': button(() => {
      const {activeId: section, travelSelected: trip, indexOpen: index, width} = latest.current;
      // Phones have their own overview, About and Travel poses (all trips, the list pulled up, a trip); other
      // sections keep the overview camera there. On desktop an open trip has its own pose.
      const travelPose = trip ? 'TravelTrip' : 'Travel';
      const phonePose = section === 'about' ? 'mobileAbout' : 'mobileOverview';
      const pose = width < SCENE_LAYOUT_CONFIG.mobileMaxWidth
        ? section === 'travel' ? `mobile${!trip && index ? 'TravelIndex' : travelPose}` : phonePose
        : section === 'travel' && trip ? 'travelTrip' : section ?? 'overview';
      const values: Record<string, unknown> = {
        [`camera.${pose}Position`]: toTuple(camera.position),
      };
      const target = controlsRef.current?.target;
      if (target) values[`camera.${pose}LookAt`] = toTuple(target);
      // The trip pose carries the marker offset the camera now shows, so the globe keeps turning trips to it.
      const offsetKey = {travelTrip: 'markerOffset', mobileTravelTrip: 'phoneMarkerOffset'}[pose] ?? null;
      const offset = offsetKey ? measureTravelOffset?.current?.() : null;
      if (offsetKey && offset) {
        const rounded: [number, number] = [round3(offset[0]), round3(offset[1])];
        values[`travelTrip.${offsetKey}`] = rounded;
        levaStore.set({[`${TRAVEL_TRIP_FOLDER_NAME}.Framing.${offsetKey}`]: rounded}, false);
      }
      void postConfigValues('Save Camera', values);
    }),
  });

  return null;
}
