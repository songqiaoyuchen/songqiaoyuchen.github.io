// All works: one section per medium (oil, digital, pencil) of justified image rows, plus the medium nav bar.
import {ALL_ARTWORKS, ARTWORK_SECTIONS, type ArtMedium} from '@/data/artworks';
import {CollectionWork} from './CollectionWork';
import {MediumNav} from './MediumNav';

export function Collection({query, activeMedium, onMediumChange, onOpen}: {
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
            {section.artworks.map((artwork) => (
              <CollectionWork artwork={artwork} key={artwork.id} onOpen={onOpen} query={query} />
            ))}
          </div>
        </section>
      ))}
      <MediumNav activeMedium={activeMedium} onMediumChange={onMediumChange} />
    </>
  );
}
