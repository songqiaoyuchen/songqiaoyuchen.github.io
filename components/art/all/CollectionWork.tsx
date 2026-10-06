// One work in the All works grid: image sized by aspect ratio, wall label, and its note (hover reveal).
import type {CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {Artwork} from '@/data/artworks';
import {WallLabel} from '../label/WallLabel';

// Rendered widths for `sizes`: each work's ratio times the row's maximum
// height (--art-grid-row-max in Collection.css), as a share of the viewport.
function imageSizes(ratio: number) {
  const share = (rowMax: number) => `${Math.min(100, Math.ceil(ratio * rowMax))}vw`;
  return `(max-width: 479px) 100vw, (max-width: 1023px) ${share(38)}, ${share(25)}`;
}

export function CollectionWork({artwork, query, onOpen}: {
  artwork: Artwork;
  query: string;
  onOpen: (id: string) => void;
}) {
  const ratio = artwork.width / artwork.height;
  return (
    <Link
      className="art-grid-work"
      href={`/artworks/${artwork.id}${query}`}
      data-artwork-id={artwork.id}
      onClick={() => onOpen(artwork.id)}
      scroll={false}
      style={{'--ratio': ratio.toFixed(4)} as CSSProperties}
    >
      <div className="art-grid-image">
        <Image
          alt={artwork.alt}
          src={artwork.src}
          width={artwork.width}
          height={artwork.height}
          sizes={imageSizes(ratio)}
        />
      </div>
      <WallLabel artwork={artwork} as="h3" className="art-grid-details" description={false} />
      {/* Hover devices reveal the note over the work; touch shows it below the label. */}
      {artwork.description && <p className="art-grid-note">{artwork.description}</p>}
    </Link>
  );
}
