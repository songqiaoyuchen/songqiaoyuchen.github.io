// Travel state shared between the route content (TravelSection) and the scene. State: the selected trip from the
// URL, the trip under the pointer and the trip the globe has captured; read by TravelSection and, through the
// canvas's context bridge, by TravelGlobe and CameraRig, so a change re-renders only them. Actions: the setters and
// the globe's outline on screen (CSS pixels, written every frame by TravelGlobe, read by the trip panel's
// placement); stable, so SceneShell passes them to the canvas without re-rendering on every change.
'use client';

import {createContext, useContext, useMemo, useRef, useState, type MutableRefObject, type ReactNode} from 'react';
import type {GlobeOutline} from './useTripSheetPlacement';

type TravelSceneState = {
  selectedId: string | null;
  hoveredId: string | null;
  capturedId: string | null;
};

type TravelSceneActions = {
  setSelectedId: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setCapturedId: (id: string | null) => void;
  globeOutline: MutableRefObject<GlobeOutline | null>;
};

const TravelSceneStateContext = createContext<TravelSceneState>({selectedId: null, hoveredId: null, capturedId: null});
const TravelSceneActionsContext = createContext<TravelSceneActions>({
  setSelectedId: () => {}, setHoveredId: () => {}, setCapturedId: () => {}, globeOutline: {current: null},
});

export function TravelSceneProvider({children}: {children: ReactNode}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [capturedId, setCapturedId] = useState<string | null>(null);
  const globeOutline = useRef<GlobeOutline | null>(null);
  const state = useMemo(() => ({selectedId, hoveredId, capturedId}), [capturedId, hoveredId, selectedId]);
  const actions = useMemo(() => ({setSelectedId, setHoveredId, setCapturedId, globeOutline}), []);
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
