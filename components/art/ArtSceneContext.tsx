// Art state shared with the scene: the requested backdrop and the dev Screenshot mode settings/export hook.
'use client';

import {createContext, useContext, useMemo, useRef, useState,
  type Dispatch, type SetStateAction, type RefObject, type ReactNode} from 'react';
import type {ArtMedium} from '@/data/artworks';
import {CAPTURE_DEFAULTS, type ArtCaptureSettings, type ArtCaptureExport} from '@/lib/art/capture';

const ArtSceneContext = createContext<{
  backdrop: ArtMedium;
  setBackdrop: (backdrop: ArtMedium) => void;
  capture: ArtCaptureSettings;
  setCapture: Dispatch<SetStateAction<ArtCaptureSettings>>;
  exportCapture: RefObject<ArtCaptureExport | null>;
}>({backdrop: 'oil', setBackdrop: () => {}, capture: CAPTURE_DEFAULTS,
  setCapture: () => {}, exportCapture: {current: null}});

export function ArtSceneProvider({children}: {children: ReactNode}) {
  const [backdrop, setBackdrop] = useState<ArtMedium>('oil');
  const [capture, setCapture] = useState(CAPTURE_DEFAULTS);
  const exportCapture = useRef<ArtCaptureExport | null>(null);
  const value = useMemo(() => ({backdrop, setBackdrop, capture, setCapture, exportCapture}), [backdrop, capture]);
  return <ArtSceneContext.Provider value={value}>{children}</ArtSceneContext.Provider>;
}

export const useArtScene = () => useContext(ArtSceneContext);
