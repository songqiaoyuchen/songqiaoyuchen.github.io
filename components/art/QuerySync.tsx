// Mirrors the URL query into ArtSection state. Isolated (with its own Suspense) so the gallery stays
// server-rendered: only reading search params needs a client boundary on statically exported routes.
'use client';

import {useSearchParams} from 'next/navigation';
import {useLayoutEffect} from 'react';

export function QuerySync({onChange}: {onChange: (query: string) => void}) {
  const search = useSearchParams();
  useLayoutEffect(() => {
    onChange(search.toString());
  }, [onChange, search]);
  return null;
}
