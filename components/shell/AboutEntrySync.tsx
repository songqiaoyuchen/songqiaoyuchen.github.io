// Reads ?entry= from the URL the page loaded with, so a direct link to /about?entry=<id> opens the drawer at
// that entry. Later in-app returns to About start at the top. Own Suspense boundary, as components/art/QuerySync.
'use client';

import {useSearchParams} from 'next/navigation';
import {useEffect, useRef} from 'react';
import {ABOUT_STOP_IDS, type AboutStopId} from '@/data/about';

export function AboutEntrySync({onEntry}: {onEntry: (stop: number) => void}) {
  const search = useSearchParams();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const stop = ABOUT_STOP_IDS.indexOf(search.get('entry') as AboutStopId);
    if (stop >= 0) onEntry(stop);
  }, [onEntry, search]);

  return null;
}
