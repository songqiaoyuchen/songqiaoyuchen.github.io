'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import {
  ALL_ARTWORKS,
  ARTWORK_SECTIONS,
  FEATURED_ARTWORKS,
  getArtwork,
  getArtworkMedium,
  type ArtMedium,
} from '@/data/artworks';
import {useSpring} from 'motion/react';
import {ART_ILLUSTRATION_CONFIG} from '@/config/scene/artIllustration';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {carouselLayout, loopOffset} from '@/lib/artworks/carouselLayout';
import {useArtScene} from './ArtSceneContext';
import {ArtInspection} from './ArtInspection';
import {ArtworkSectionNav} from './ArtworkSectionNav';
import {useGalleryTransition} from './useGalleryTransition';

// Critically damped: retargeting keeps the current velocity, so rapid input
// reads as one continuous rotation instead of a restart per step.
const CAROUSEL_SPRING = {stiffness: 140, damping: 24, restDelta: 0.0005, restSpeed: 0.005};
// Server and first client render, before the stage is measured.
const INITIAL_POSES = carouselLayout(FEATURED_ARTWORKS.map(() => ({width: 0, height: 0})), 0, false).slides;

type StageSize = {width: number; height: number; vertical: boolean};

function frameSize(artwork: {width: number; height: number}, stage: StageSize) {
  const ratio = artwork.width / artwork.height;
  const width = Math.min(
    stage.width * (stage.vertical ? 0.8 : 0.66),
    stage.height * (stage.vertical ? 0.6 : 0.88) * ratio,
  );
  return {width, height: width / ratio};
}

function selectedIndexFromUrl() {
  const id = new URLSearchParams(window.location.search).get('selected');
  return Math.max(0, FEATURED_ARTWORKS.findIndex((artwork) => artwork.id === id));
}

// Keep the gallery server-rendered; only URL query synchronization needs a
// client boundary on statically exported routes.
function ArtQuerySync({onChange}: {onChange: (query: string) => void}) {
  const search = useSearchParams();
  useLayoutEffect(() => {
    onChange(search.toString());
  }, [onChange, search]);
  return null;
}

export function ArtExperience() {
  const pathname = usePathname().replace(/\/+$/, '');
  const [queryString, setQueryString] = useState('');
  const search = new URLSearchParams(queryString);
  const router = useRouter();
  const {setMedium} = useArtScene();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({width: 0, height: 0, vertical: false});
  const [collectionMedium, setCollectionMedium] = useState<ArtMedium>(getArtworkMedium(ALL_ARTWORKS[0]));
  const pointer = useRef<{x: number; y: number} | null>(null);
  const dragged = useRef(false);
  const openedHere = useRef(false);
  const returnContext = useRef<{id: string; scroll: number} | null>(null);
  const previousInspection = useRef(false);
  const wheel = useRef({delta: 0, timer: 0});
  const inspectionId = pathname.split('/').filter(Boolean)[1];
  const inspecting = inspectionId ? getArtwork(inspectionId) : undefined;
  const all =
    pathname.endsWith('/all') ||
    search.get('view') === 'all' ||
    (!!inspecting && search.get('view') !== 'selected');
  const {galleryRef, captureGallery} = useGalleryTransition(all);
  const filter = ARTWORK_SECTIONS.some(({id}) => id === search.get('medium')) ? search.get('medium')! : 'all';
  const selected = FEATURED_ARTWORKS.find(({id}) => id === search.get('selected')) ?? FEATURED_ARTWORKS[0];
  const index = FEATURED_ARTWORKS.indexOf(selected);
  const medium = inspecting
    ? getArtworkMedium(inspecting)
    : all ? collectionMedium : getArtworkMedium(selected);
  const params = new URLSearchParams(search.toString());
  params.set('view', all ? 'all' : 'selected');
  const query = params.size ? `?${params}` : '';
  const returnParams = new URLSearchParams(params);
  returnParams.delete('view');
  const collectionHref = `/artworks${all ? '/all' : ''}${returnParams.size ? `?${returnParams}` : ''}`;

  // The gallery follows input immediately; the scene waits for browsing to
  // pause so passing through other media never starts their wipes.
  const sceneMediumSet = useRef(false);
  useEffect(() => {
    if (!sceneMediumSet.current) {
      sceneMediumSet.current = true;
      setMedium(medium);
      return;
    }
    const timer = window.setTimeout(() => setMedium(medium), ART_ILLUSTRATION_CONFIG.settleSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [medium, setMedium]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const media = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const measure = () => setStageSize({
      width: stage.clientWidth, height: stage.clientHeight, vertical: media.matches,
    });
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    media.addEventListener('change', measure);
    measure();
    return () => {
      observer.disconnect();
      media.removeEventListener('change', measure);
    };
  }, [all]);

  // One unwrapped position drives every slide; it advances by the shortest
  // loop distance so wrapping never spins the carousel the long way round.
  const reducedMotion = useReducedMotion();
  const position = useSpring(0, CAROUSEL_SPRING);
  const positionTarget = useRef(0);
  const animateSelection = useRef(false);
  useLayoutEffect(() => {
    positionTarget.current += loopOffset(index - positionTarget.current, FEATURED_ARTWORKS.length);
    // URL restores and history navigation place the carousel without motion.
    if (animateSelection.current && !reducedMotion) position.set(positionTarget.current);
    else position.jump(positionTarget.current);
    animateSelection.current = false;
  }, [index, position, reducedMotion]);

  // Write poses directly each frame; React never renders the animated values.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !stageSize.width) return;
    const sizes = FEATURED_ARTWORKS.map((artwork) => frameSize(artwork, stageSize));
    const slides = Array.from(stage.children) as HTMLElement[];
    const apply = (value: number) => {
      const layout = carouselLayout(sizes, value, stageSize.vertical);
      stage.style.setProperty('--art-frame-half-height', `${layout.centerHeight / 2}px`);
      layout.slides.forEach((pose, slideIndex) => {
        const style = slides[slideIndex].style;
        style.setProperty('--offset', `${pose.offset}`);
        style.setProperty('--abs-offset', `${Math.abs(pose.offset)}`);
        style.setProperty('--shift', `${pose.shift}px`);
        style.width = `${pose.width}px`;
        style.height = `${pose.height}px`;
        style.opacity = `${pose.opacity}`;
        style.zIndex = pose.front ? '1' : '0';
      });
    };
    apply(position.get());
    return position.on('change', apply);
  }, [all, position, stageSize]);

  useEffect(() => {
    const wasInspecting = previousInspection.current;
    previousInspection.current = !!inspecting;
    if (!wasInspecting || inspecting) return;
    const frame = requestAnimationFrame(() => {
      const context = returnContext.current;
      const target = context
        ? document.querySelector<HTMLElement>(`[data-artwork-id="${context.id}"]`)
        : stageRef.current;
      target?.focus({preventScroll: true});
      if (context) window.scrollTo(0, context.scroll);
    });
    return () => cancelAnimationFrame(frame);
  }, [inspecting]);

  function rememberCollection(id: string) {
    openedHere.current = true;
    returnContext.current = {id, scroll: window.scrollY};
  }

  const select = useCallback((next: number) => {
    animateSelection.current = true;
    const artwork = FEATURED_ARTWORKS[(next + FEATURED_ARTWORKS.length) % FEATURED_ARTWORKS.length];
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('selected', artwork.id);
    window.history.replaceState(null, '', `${window.location.pathname}?${nextParams}`);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || all || inspecting) return;
    const gesture = wheel.current;
    // Every wheel step moves the carousel; fast or reversed scrolling is never ignored.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      window.clearTimeout(gesture.timer);
      gesture.timer = window.setTimeout(() => { gesture.delta = 0; }, 180);
      const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const delta = raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
      // Reversing discards travel accumulated in the old direction.
      if (Math.sign(delta) !== Math.sign(gesture.delta)) gesture.delta = 0;
      gesture.delta += delta;
      if (Math.abs(gesture.delta) < 45) return;
      // Read the URL, not render state: several steps can land before React re-renders.
      select(selectedIndexFromUrl() + Math.sign(gesture.delta));
      gesture.delta = 0;
    };
    stage.addEventListener('wheel', onWheel, {passive: false});
    return () => {
      stage.removeEventListener('wheel', onWheel);
      window.clearTimeout(gesture.timer);
    };
  }, [all, inspecting, select]);

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const vertical = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
    const distance = vertical ? start.y - event.clientY : start.x - event.clientX;
    if (Math.abs(distance) > 35) {
      dragged.current = true;
      select(selectedIndexFromUrl() + Math.sign(distance));
    }
  };

  function scopeHref(view: 'selected' | 'all', nextFilter = filter) {
    const next = new URLSearchParams(search.toString());
    next.delete('view');
    if (view !== 'all') {
      next.delete('medium');
    }
    if (view === 'all' && nextFilter !== 'all') next.set('medium', nextFilter);
    else next.delete('medium');
    return `/artworks${view === 'all' ? '/all' : ''}${next.size ? `?${next}` : ''}`;
  }

  function closeInspection() {
    if (openedHere.current) {
      router.back();
    } else router.replace(collectionHref, {scroll: false});
  }

  return (
    <>
      <Suspense>
        <ArtQuerySync onChange={setQueryString} />
      </Suspense>
      <main ref={galleryRef} className={`art-section ${all ? 'art-section-all' : ''}`} data-medium={medium}>
        <h1 className="sr-only">{all ? 'All artworks' : 'Art'}</h1>
        <nav className="art-collection-bar" aria-label="Art navigation">
            <Link className="art-text-link art-home" href="/">← Home</Link>
            <Link className="art-text-link" href={scopeHref(all ? 'selected' : 'all')}
              onNavigate={captureGallery} scroll={false}>
              {all ? '← Selected works' : 'All works ↗'}
            </Link>
        </nav>

        <section className="art-gallery" aria-label={all ? 'All artworks' : 'Selected artworks'}>

          {all ? (
            <>
              <p className="sr-only">{ALL_ARTWORKS.length} artworks</p>
              {ARTWORK_SECTIONS.map((section) => (
                <section className="art-medium-section" id={section.id} key={section.id}
                  aria-labelledby={`${section.id}-title`}>
                  <h2 className="art-medium-title" id={`${section.id}-title`}>{section.label}</h2>
                  <div className="art-grid">
                    {section.artworks.map((artwork) => (
                      <Link
                        className="art-grid-work"
                        href={`/artworks/${artwork.id}${query}`}
                        key={artwork.id}
                        data-artwork-id={artwork.id}
                        onClick={() => rememberCollection(artwork.id)}
                        scroll={false}
                      >
                        <div className="art-grid-image">
                          <Image
                            alt={artwork.alt}
                            src={artwork.src}
                            width={artwork.width}
                            height={artwork.height}
                            sizes="(max-width: 479px) 90vw, (max-width: 1023px) 44vw, 30vw"
                          />
                          <div className="art-grid-details">
                            <p className="art-grid-meta">
                              {artwork.material} <span aria-hidden="true">/</span> {artwork.size}
                            </p>
                            <h3>{artwork.title}</h3>
                            {artwork.description && <p className="art-grid-description">{artwork.description}</p>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
              <ArtworkSectionNav activeMedium={collectionMedium} onMediumChange={setCollectionMedium} />
            </>
          ) : (
            <>
              <div className="art-stage">
              <div
                className="art-carousel"
                ref={stageRef}
                role="region"
                aria-roledescription="carousel"
                aria-label="Selected works. Use arrow keys or scroll to browse."
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (
                    ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)
                  ) {
                    event.preventDefault();
                    select(
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? FEATURED_ARTWORKS.length - 1
                          : selectedIndexFromUrl() + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1),
                    );
                  }
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  pointer.current = {x: event.clientX, y: event.clientY};
                  dragged.current = false;
                }}
                onPointerMove={(event) => {
                  if (
                    pointer.current &&
                    Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 10
                  ) {
                    dragged.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
                }}
                onPointerUp={endPointer}
                onPointerCancel={() => {
                  pointer.current = null;
                }}
                onClickCapture={(event) => {
                  if (dragged.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    dragged.current = false;
                  }
                }}
              >
                {FEATURED_ARTWORKS.map((artwork, artworkIndex) => {
                  let offset = (artworkIndex - index + FEATURED_ARTWORKS.length) % FEATURED_ARTWORKS.length;
                  if (offset > FEATURED_ARTWORKS.length / 2) offset -= FEATURED_ARTWORKS.length;
                  const current = offset === 0;
                  const visible = Math.abs(offset) <= 1;
                  // Constant across renders: the position spring owns the live pose.
                  const initial = INITIAL_POSES[artworkIndex];
                  return (
                    <div
                      className="art-carousel-slide"
                      key={artwork.id}
                      data-current={current}
                      aria-hidden={!visible}
                      inert={!visible}
                      style={
                        {
                          '--offset': initial.offset,
                          '--abs-offset': Math.abs(initial.offset),
                          '--shift': `${initial.shift}px`,
                          opacity: initial.opacity,
                        } as CSSProperties
                      }
                    >
                      <Link
                        className="art-frame"
                        href={`/artworks/${artwork.id}${query}`}
                        aria-label={`${current ? 'Enlarge' : 'View'} ${artwork.title}`}
                        tabIndex={visible ? 0 : -1}
                        data-artwork-id={artwork.id}
                        onClick={(event) => {
                          if (current) rememberCollection(artwork.id);
                          else if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                            event.preventDefault();
                            select(artworkIndex);
                          }
                        }}
                        scroll={false}
                        draggable={false}
                      >
                        <Image
                          alt={artwork.alt}
                          src={artwork.src}
                          width={artwork.width}
                          height={artwork.height}
                          priority={artworkIndex === 0}
                          sizes="(max-width: 767px) 78vw, 38vw"
                          draggable={false}
                        />
                      </Link>
                    </div>
                  );
                })}
              </div>
              </div>
              <div className="art-caption" aria-live="polite" aria-atomic="true">
                <div key={selected.id}>
                  <span className="sr-only">Work {index + 1} of {FEATURED_ARTWORKS.length}. </span>
                  <h2>{selected.title}</h2>
                  <p className="art-eyebrow">
                    {selected.material}
                    <span aria-hidden="true"> · </span>
                    {selected.size}
                  </p>
                  {selected.description && <p className="art-description">{selected.description}</p>}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
      {inspecting && (
        <ArtInspection artwork={inspecting} collectionHref={collectionHref} onClose={closeInspection} />
      )}
    </>
  );
}
