'use client';

import {createContext, useContext, useMemo, useRef, useState,
  type Dispatch, type SetStateAction, type RefObject, type ReactNode} from 'react';
import type {ArtMedium} from '@/data/artworks';
import {CAPTURE_DEFAULTS, type ArtCaptureSettings, type ArtCaptureExport} from '@/lib/terrain/artCapture';

const ArtSceneContext = createContext<{
  medium: ArtMedium;
  setMedium: (medium: ArtMedium) => void;
  capture: ArtCaptureSettings;
  setCapture: Dispatch<SetStateAction<ArtCaptureSettings>>;
  exportCapture: RefObject<ArtCaptureExport | null>;
}>({medium: 'oil', setMedium: () => {}, capture: CAPTURE_DEFAULTS,
  setCapture: () => {}, exportCapture: {current: null}});

export function ArtSceneProvider({children}: {children: ReactNode}) {
  const [medium, setMedium] = useState<ArtMedium>('oil');
  const [capture, setCapture] = useState(CAPTURE_DEFAULTS);
  const exportCapture = useRef<ArtCaptureExport | null>(null);
  const value = useMemo(() => ({medium, setMedium, capture, setCapture, exportCapture}), [medium, capture]);
  return <ArtSceneContext.Provider value={value}>{children}</ArtSceneContext.Provider>;
}

export const useArtScene = () => useContext(ArtSceneContext);
