// Reads the Art URL: which view (selected/all), the selected work, the inspected work and onward links.
// Paths: /artworks (selected), /artworks/all (collection), /artworks/[id] (inspection; ?view= keeps its source).
'use client';

import {usePathname} from 'next/navigation';
import {
  ARTWORK_SECTIONS,
  FEATURED_ARTWORKS,
  getArtwork,
} from '@/data/artworks';

export type ArtView = 'selected' | 'all';

export function useArtRoute(queryString: string) {
  const pathname = usePathname().replace(/\/+$/, '');
  const search = new URLSearchParams(queryString);
  const inspectionId = pathname.split('/').filter(Boolean)[1];
  const inspecting = inspectionId ? getArtwork(inspectionId) : undefined;
  const all =
    pathname.endsWith('/all') ||
    search.get('view') === 'all' ||
    (!!inspecting && search.get('view') !== 'selected');
  const filter = ARTWORK_SECTIONS.some(({id}) => id === search.get('medium')) ? search.get('medium')! : 'all';
  const selected = FEATURED_ARTWORKS.find(({id}) => id === search.get('selected')) ?? FEATURED_ARTWORKS[0];
  const index = FEATURED_ARTWORKS.indexOf(selected);

  // Query for artwork links: remembers which view an inspection was opened from.
  const params = new URLSearchParams(search.toString());
  params.set('view', all ? 'all' : 'selected');
  const query = params.size ? `?${params}` : '';
  // Where closing an inspection returns to.
  const returnParams = new URLSearchParams(params);
  returnParams.delete('view');
  const collectionHref = `/artworks${all ? '/all' : ''}${returnParams.size ? `?${returnParams}` : ''}`;

  /** Link to the other view; the medium filter only survives into All works. */
  function scopeHref(view: ArtView, nextFilter = filter) {
    const next = new URLSearchParams(search.toString());
    next.delete('view');
    if (view !== 'all') {
      next.delete('medium');
    }
    if (view === 'all' && nextFilter !== 'all') next.set('medium', nextFilter);
    else next.delete('medium');
    return `/artworks${view === 'all' ? '/all' : ''}${next.size ? `?${next}` : ''}`;
  }

  return {all, inspecting, selected, index, query, collectionHref, scopeHref};
}
