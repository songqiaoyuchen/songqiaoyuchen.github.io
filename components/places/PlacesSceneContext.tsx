// Places state shared between the route content (PlacesSection) and the scene. State: the selected location, read from
// the URL here so the scene sees the route's view from its first frame (a refresh on a location opens on it), the
// location under the pointer, the location the globe has captured and, on phones, whether the location list is pulled
// up (the camera steps back); read by PlacesSection and, through the canvas's context bridge, by PlacesGlobe and
// CameraRig, so a change re-renders only them. Actions: the setters and the globe's outline on screen (CSS pixels,
// written every frame by PlacesGlobe, read by the location panel's placement) and the place facing the camera (read by
// the location index's meridian strip), and a request for the globe to turn a location to its centre (the phone
// sheet's swipe, taken up by PlacesGlobe on its next frame); stable, so SceneShell passes them to the canvas without
// re-rendering on every change.
'use client';

import {createContext, useContext, useMemo, useRef, useState, type MutableRefObject, type ReactNode} from 'react';
import {useRouteLocation} from './usePlacesRoute';
import type {GlobeOutline} from './useLocationSheetPlacement';

type PlacesSceneState = {
  selectedId: string | null;
  hoveredId: string | null;
  capturedId: string | null;
  indexOpen: boolean;
};

/** The place at the globe's centre as seen, degrees. */
export type GlobeFront = {lon: number; lat: number};

type PlacesSceneActions = {
  setHoveredId: (id: string | null) => void;
  setCapturedId: (id: string | null) => void;
  setIndexOpen: (open: boolean) => void;
  globeOutline: MutableRefObject<GlobeOutline | null>;
  globeFront: MutableRefObject<GlobeFront | null>;
  /** A location id for the globe to turn to its centre over all locations; PlacesGlobe clears it. */
  turnRequest: MutableRefObject<string | null>;
};

const PlacesSceneStateContext = createContext<PlacesSceneState>({
  selectedId: null, hoveredId: null, capturedId: null, indexOpen: false,
});
const PlacesSceneActionsContext = createContext<PlacesSceneActions>({
  setHoveredId: () => {}, setCapturedId: () => {}, setIndexOpen: () => {},
  globeOutline: {current: null}, globeFront: {current: null}, turnRequest: {current: null},
});

export function PlacesSceneProvider({children}: {children: ReactNode}) {
  const selectedId = useRouteLocation()?.id ?? null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [capturedId, setCapturedId] = useState<string | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const globeOutline = useRef<GlobeOutline | null>(null);
  const globeFront = useRef<GlobeFront | null>(null);
  const turnRequest = useRef<string | null>(null);
  const state = useMemo(
    () => ({selectedId, hoveredId, capturedId, indexOpen}), [capturedId, hoveredId, indexOpen, selectedId]);
  const actions = useMemo(
    () => ({setHoveredId, setCapturedId, setIndexOpen, globeOutline, globeFront, turnRequest}), []);
  return (
    <PlacesSceneActionsContext.Provider value={actions}>
      <PlacesSceneStateContext.Provider value={state}>{children}</PlacesSceneStateContext.Provider>
    </PlacesSceneActionsContext.Provider>
  );
}

/** The selected, hovered and captured locations and the phone list; re-renders the reader on every change. */
export const usePlacesScene = () => useContext(PlacesSceneStateContext);
/** The setters and the outline ref; stable. */
export const usePlacesSceneActions = () => useContext(PlacesSceneActionsContext);
