'use client';

import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';
import type {ArtMedium} from '@/data/artworks';

const ArtSceneContext = createContext<{
  medium: ArtMedium;
  setMedium: (medium: ArtMedium) => void;
}>({medium: 'oil', setMedium: () => {}});

export function ArtSceneProvider({children}: {children: ReactNode}) {
  const [medium, setMedium] = useState<ArtMedium>('oil');
  const value = useMemo(() => ({medium, setMedium}), [medium]);
  return <ArtSceneContext.Provider value={value}>{children}</ArtSceneContext.Provider>;
}

export const useArtScene = () => useContext(ArtSceneContext);
