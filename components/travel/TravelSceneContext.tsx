// Travel state shared between the route content (TravelSection) and the scene. State: the selected trip, read
// from the URL here so the scene sees the route's view from its first frame (a refresh on a trip opens on it), the
// trip under the pointer and the trip the globe has captured; read by TravelSection and, through the
// canvas's context bridge, by TravelGlobe and CameraRig, so a change re-renders only them. Actions: the setters and
// the globe's outline on screen (CSS pixels, written every frame by TravelGlobe, read by the trip panel's
// placement) and the place facing the camera (read by the trip index's meridian strip); stable, so SceneShell
// passes them to the canvas without re-rendering on every change.
'use client';

import {createContext, useContext, useMemo, useRef, useState, type MutableRefObject, type ReactNode} from 'react';
import {useRouteTrip} from './useTravelRoute';
import type {GlobeOutline} from './useTripSheetPlacement';

type TravelSceneState = {
  selectedId: string | null;
  hoveredId: string | null;
  capturedId: string | null;
};

/** The place at the globe's centre as seen, degrees. */
export type GlobeFront = {lon: number; lat: number};

type TravelSceneActions = {
  setHoveredId: (id: string | null) => void;
  setCapturedId: (id: string | null) => void;
  globeOutline: MutableRefObject<GlobeOutline | null>;
  globeFront: MutableRefObject<GlobeFront | null>;
};

const TravelSceneStateContext = createContext<TravelSceneState>({selectedId: null, hoveredId: null, capturedId: null});
const TravelSceneActionsContext = createContext<TravelSceneActions>({
  setHoveredId: () => {}, setCapturedId: () => {}, globeOutline: {current: null}, globeFront: {current: null},
});

export function TravelSceneProvider({children}: {children: ReactNode}) {
  const selectedId = useRouteTrip()?.id ?? null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [capturedId, setCapturedId] = useState<string | null>(null);
  const globeOutline = useRef<GlobeOutline | null>(null);
  const globeFront = useRef<GlobeFront | null>(null);
  const state = useMemo(() => ({selectedId, hoveredId, capturedId}), [capturedId, hoveredId, selectedId]);
  const actions = useMemo(() => ({setHoveredId, setCapturedId, globeOutline, globeFront}), []);
  return (
    <TravelSceneActionsContext.Provider value={actions}>
      <TravelSceneStateContext.Provider value={state}>{children}</TravelSceneStateContext.Provider>
    </TravelSceneActionsContext.Provider>
  );
}

/** The selected, hovered and captured trips; re-renders the reader on every change. */
export const useTravelScene = () => useContext(TravelSceneStateContext);
/** The setters and the outline ref; stable. */
export const useTravelSceneActions = () => useContext(TravelSceneActionsContext);
