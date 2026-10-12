// Art section (/artworks, /artworks/all, /artworks/[id]): Selected works carousel, All works collection
// and the inspection dialog. Orchestrates route state; hooks run in a fixed order, so keep it.
'use client';

import {useRouter} from 'next/navigation';
import {Suspense, useState} from 'react';
import {SectionClose} from '@/components/site/SectionClose';
import {ALL_ARTWORKS, getArtworkMedium, type ArtMedium} from '@/data/artworks';
import {Collection} from './all/Collection';
import {CollectionHeader} from './all/CollectionHeader';
import {useArtScene} from './ArtSceneContext';
import {Inspection} from './inspection/Inspection';
import {QuerySync} from './QuerySync';
import {ScopeLink} from './ScopeLink';
import {Caption} from './selected/Caption';
import {Carousel} from './selected/Carousel';
import {selectedIndexFromUrl, useCarouselInput} from './selected/useCarouselInput';
import {useCarouselMotion} from './selected/useCarouselMotion';
import {useGalleryTransition} from './transition/useGalleryTransition';
import {useArtRoute} from './useArtRoute';
import {useBackdropSync} from './useBackdropSync';
import {useInspectionReturn} from './useInspectionReturn';

export function ArtSection() {
  const [queryString, setQueryString] = useState('');
  const {all, inspecting, selected, index, query, collectionHref, scopeHref} = useArtRoute(queryString);
  const router = useRouter();
  const {setBackdrop} = useArtScene();
  const [collectionMedium, setCollectionMedium] = useState<ArtMedium>(getArtworkMedium(ALL_ARTWORKS[0]));
  const {galleryRef, captureGallery} = useGalleryTransition(all);
  // The backdrop follows the inspected work, else the visible medium section, else the selected work.
  const medium = inspecting
    ? getArtworkMedium(inspecting)
    : all ? collectionMedium : getArtworkMedium(selected);
  useBackdropSync(medium, setBackdrop);
  const {stageRef, stageSize, animateSelectionRef} = useCarouselMotion(index, all);
  const {openedHere, rememberCollection} = useInspectionReturn(inspecting, stageRef);
  const {select, leaving, setLeaving, stageHandlers} =
    useCarouselInput({stageRef, animateSelectionRef, enabled: !all && !inspecting});

  // Selected works leads deeper into All works; All works leads back. Each sits
  // at the right end of its view's title row.
  const scopeLink = (
    <ScopeLink all={all} href={scopeHref(all ? 'selected' : 'all')} onNavigate={() => {
      setLeaving(null);
      captureGallery();
    }} />
  );

  function closeInspection() {
    if (openedHere.current) {
      router.back();
    } else router.replace(collectionHref, {scroll: false});
  }

  return (
    <>
      <Suspense>
        <QuerySync onChange={setQueryString} />
      </Suspense>
      <main ref={galleryRef} className={`art-section ${all ? 'art-section-all' : ''}`} data-medium={medium}>
        {all ? <CollectionHeader scopeLink={scopeLink} /> : (
          <>
            <h1 className="sr-only">Art</h1>
            <SectionClose className="art-close" label="Art" />
          </>
        )}

        <section className="art-gallery" aria-label={all ? 'All artworks' : 'Selected artworks'}>

          {all ? (
            <Collection query={query} activeMedium={collectionMedium}
              onMediumChange={setCollectionMedium} onOpen={rememberCollection} />
          ) : (
            <>
              <Carousel
                index={index}
                query={query}
                stageRef={stageRef}
                stageHandlers={stageHandlers}
                onSelect={select}
                onStep={(direction) => select(selectedIndexFromUrl() + direction)}
                onOpen={rememberCollection}
              />
              <Caption
                selected={selected}
                index={index}
                leaving={leaving}
                stageSize={stageSize}
                onLeft={() => setLeaving(null)}
                scopeLink={scopeLink}
              />
            </>
          )}
        </section>
      </main>
      {inspecting && (
        <Inspection artwork={inspecting} collectionHref={collectionHref} onClose={closeInspection} />
      )}
    </>
  );
}
