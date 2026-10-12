// Art state shared with the scene, as two contexts so a backdrop change re-renders only its readers (the shell and
// the terrain cache) and the dev Screenshot mode's settings and export hook reach only theirs.
'use client';

import {createContext, useContext, useMemo, useRef, useState,
  type Dispatch, type SetStateAction, type RefObject, type ReactNode} from 'react';
import type {ArtMedium} from '@/data/artworks';
import {CAPTURE_DEFAULTS, type ArtCaptureSettings, type ArtCaptureExport} from '@/lib/art/capture';

const ArtBackdropContext = createContext<{
  backdrop: ArtMedium;
  setBackdrop: (backdrop: ArtMedium) => void;
}>({backdrop: 'oil', setBackdrop: () => {}});

const ArtCaptureContext = createContext<{
  capture: ArtCaptureSettings;
  setCapture: Dispatch<SetStateAction<ArtCaptureSettings>>;
  exportCapture: RefObject<ArtCaptureExport | null>;
}>({capture: CAPTURE_DEFAULTS, setCapture: () => {}, exportCapture: {current: null}});

export function ArtSceneProvider({children}: {children: ReactNode}) {
  const [backdrop, setBackdrop] = useState<ArtMedium>('oil');
  const [capture, setCapture] = useState(CAPTURE_DEFAULTS);
  const exportCapture = useRef<ArtCaptureExport | null>(null);
  const backdropValue = useMemo(() => ({backdrop, setBackdrop}), [backdrop]);
  const captureValue = useMemo(() => ({capture, setCapture, exportCapture}), [capture]);
  return (
    <ArtBackdropContext.Provider value={backdropValue}>
      <ArtCaptureContext.Provider value={captureValue}>{children}</ArtCaptureContext.Provider>
    </ArtBackdropContext.Provider>
  );
}

/** The requested backdrop and its setter. */
export const useArtBackdrop = () => useContext(ArtBackdropContext);
/** The dev Screenshot mode settings and export hook. */
export const useArtCapture = () => useContext(ArtCaptureContext);
