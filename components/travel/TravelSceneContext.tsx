// Travel state shared between the route content (TravelSection) and the scene (TravelGlobe through SceneShell):
// the selected trip from the URL, the trip under the pointer, the trip the globe has captured, and the globe's
// outline on screen (CSS pixels, written every frame by TravelGlobe, read by the trip panel's placement).
'use client';

import {createContext, useContext, useMemo, useRef, useState, type MutableRefObject, type ReactNode} from 'react';
import type {GlobeOutline} from './useTripSheetPlacement';

type TravelScene = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  capturedId: string | null;
  setCapturedId: (id: string | null) => void;
  globeOutline: MutableRefObject<GlobeOutline | null>;
};

const TravelSceneContext = createContext<TravelScene>({
  selectedId: null, setSelectedId: () => {},
  hoveredId: null, setHoveredId: () => {},
  capturedId: null, setCapturedId: () => {},
  globeOutline: {current: null},
});

export function TravelSceneProvider({children}: {children: ReactNode}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [capturedId, setCapturedId] = useState<string | null>(null);
  const globeOutline = useRef<GlobeOutline | null>(null);
  const value = useMemo(
    () => ({selectedId, setSelectedId, hoveredId, setHoveredId, capturedId, setCapturedId, globeOutline}),
    [capturedId, hoveredId, selectedId],
  );
  return <TravelSceneContext.Provider value={value}>{children}</TravelSceneContext.Provider>;
}

export const useTravelScene = () => useContext(TravelSceneContext);
