import type {CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ALL_ARTWORKS, ARTWORK_SECTIONS, type ArtMedium} from '@/data/artworks';
import {ArtworkLabel} from './ArtworkLabel';
import {ArtworkSectionNav} from './ArtworkSectionNav';

// Rendered widths for `sizes`: each work's ratio times the row's maximum
// height (--art-grid-row-max in art.css), as a share of the viewport.
function imageSizes(ratio: number) {
  const share = (rowMax: number) => `${Math.min(100, Math.ceil(ratio * rowMax))}vw`;
  return `(max-width: 479px) 100vw, (max-width: 1023px) ${share(38)}, ${share(25)}`;
}

export function ArtCollection({query, activeMedium, onMediumChange, onOpen}: {
  query: string;
  activeMedium: ArtMedium;
  onMediumChange: (medium: ArtMedium) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <p className="sr-only">{ALL_ARTWORKS.length} artworks</p>
      {ARTWORK_SECTIONS.map((section) => (
        <section className="art-medium-section" id={section.id} key={section.id}
          aria-labelledby={`${section.id}-title`}>
          <h2 className="art-medium-title" id={`${section.id}-title`}>
            {section.label}
            <span className="art-medium-total" aria-hidden="true">
              {String(section.artworks.length).padStart(2, '0')}
            </span>
            <span className="sr-only">, {section.artworks.length} works</span>
          </h2>
          {/* Justified rows: each work grows in proportion to its aspect ratio,
              so every image in a row shares one height. */}
          <div className="art-grid">
            {section.artworks.map((artwork) => {
              const ratio = artwork.width / artwork.height;
              return (
                <Link
                  className="art-grid-work"
                  href={`/artworks/${artwork.id}${query}`}
                  key={artwork.id}
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
                  <ArtworkLabel artwork={artwork} as="h3" className="art-grid-details" description={false} />
                  {/* Hover devices reveal the note over the work; touch shows it below the label. */}
                  {artwork.description && <p className="art-grid-note">{artwork.description}</p>}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      <ArtworkSectionNav activeMedium={activeMedium} onMediumChange={onMediumChange} />
    </>
  );
}
