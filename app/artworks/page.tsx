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
    <main className="relative min-h-svh overflow-x-clip bg-background pb-32 pt-28 text-text sm:pt-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <header className="pb-10 pt-8 sm:pb-14 sm:pt-12">
          <h1 className="m-0 font-serif text-display font-normal italic leading-none text-text sm:text-5xl">
            Artworks
          </h1>
        </header>

        {ARTWORK_SECTIONS.map((section) => {
          const firstImageIsPriority = section.id === firstPopulatedSectionId;

          return (
            <section
              aria-labelledby={`${section.id}-title`}
              className="scroll-mt-8 pb-20 last:pb-0 sm:pb-28"
              id={section.id}
              key={section.id}
            >
              <header className="mb-10 sm:mb-14">
                <h2
                  className="m-0 font-serif text-4xl font-normal italic leading-none text-text sm:text-5xl"
                  id={`${section.id}-title`}
                >
                  {section.label}
                </h2>
              </header>

              {section.artworks.length > 0 && (
                <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
