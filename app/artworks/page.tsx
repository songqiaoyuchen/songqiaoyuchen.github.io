import type {Metadata} from 'next';
import {ArtworkSectionNav} from '@/components/artworks/ArtworkSectionNav';
import {ArtworkViewer} from '@/components/artworks/ArtworkViewer';
import {ARTWORK_SECTIONS} from '@/data/artworks';

export const metadata: Metadata = {
  title: 'Artworks | Song',
  description: 'Paintings, drawings, and digital artwork by Song.',
};

export default function ArtworksPage() {
  const firstPopulatedSectionId = ARTWORK_SECTIONS.find(
    (section) => section.artworks.length > 0,
  )?.id;

  return (
    <main
      className="relative min-h-svh overflow-x-clip bg-background pb-40 pt-28 text-text sm:pb-48 sm:pt-32"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        {ARTWORK_SECTIONS.map((section) => {
          const firstImageIsPriority = section.id === firstPopulatedSectionId;

          return (
            <section
              aria-labelledby={`${section.id}-title`}
              className="scroll-mt-24 pb-28 last:pb-0 sm:pb-40"
              id={section.id}
              key={section.id}
            >
              <header className="mb-14 sm:mb-20">
                <h2
                  className="m-0 text-center font-serif text-2xl bold font-normal italic leading-none text-accent"
                  id={`${section.id}-title`}
                >
                  {section.label}
                </h2>
              </header>

              {section.artworks.length > 0 && (
                <div
                  className="mx-auto grid max-w-4xl items-start gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-16"
                >
                  {section.artworks.map((artwork, artworkIndex) => (
                    <ArtworkViewer
                      artwork={artwork}
                      key={artwork.id}
                      priority={firstImageIsPriority && artworkIndex === 0}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <ArtworkSectionNav
        sections={ARTWORK_SECTIONS.map(({id, label}) => ({id, label}))}
      />
    </main>
  );
}
