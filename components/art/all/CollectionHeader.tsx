// All works title row: the heading with the total count on the left, the way back to Selected works on the right.
import type {ReactNode} from 'react';
import {ALL_ARTWORKS} from '@/data/artworks';

export function CollectionHeader({scopeLink}: {scopeLink: ReactNode}) {
  return (
    <header className="art-collection-head">
      <h1 className="art-collection-title">
        All works <span className="art-medium-total" aria-hidden="true">{ALL_ARTWORKS.length}</span>
      </h1>
      {scopeLink}
    </header>
  );
}
