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
import {useArtScene} from './ArtSceneContext';
import {ArtInspection} from './ArtInspection';
import {ArtworkSectionNav} from './ArtworkSectionNav';

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
  const wheel = useRef({delta: 0, last: 0, locked: false, timer: 0});
  const inspectionId = pathname.split('/').filter(Boolean)[1];
  const inspecting = inspectionId ? getArtwork(inspectionId) : undefined;
  const all =
    pathname.endsWith('/all') ||
    search.get('view') === 'all' ||
    (!!inspecting && search.get('view') !== 'selected');
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

  useEffect(() => {
    setMedium(medium);
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

  function frameSize(artwork: typeof selected) {
    const ratio = artwork.width / artwork.height;
    const width = Math.min(
      stageSize.width * (stageSize.vertical ? 0.8 : 0.66),
      stageSize.height * (stageSize.vertical ? 0.6 : 0.88) * ratio,
    );
    return {width, height: width / ratio};
  }
  const center = frameSize(selected);

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
    const artwork = FEATURED_ARTWORKS[(next + FEATURED_ARTWORKS.length) % FEATURED_ARTWORKS.length];
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('selected', artwork.id);
    window.history.replaceState(null, '', `${window.location.pathname}?${nextParams}`);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || all || inspecting) return;
    const gesture = wheel.current;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const now = performance.now();
      if (now - gesture.last > 180) {
        gesture.delta = 0;
        gesture.locked = false;
      }
      gesture.last = now;
      window.clearTimeout(gesture.timer);
      gesture.timer = window.setTimeout(() => {
        gesture.locked = false;
        gesture.delta = 0;
      }, 180);
      if (gesture.locked) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      gesture.delta += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
      if (Math.abs(gesture.delta) >= 45) {
        select(index + Math.sign(gesture.delta));
        gesture.locked = true;
        gesture.delta = 0;
      }
    };
    stage.addEventListener('wheel', onWheel, {passive: false});
    return () => {
      stage.removeEventListener('wheel', onWheel);
      window.clearTimeout(gesture.timer);
    };
  }, [all, index, inspecting, select]);

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const vertical = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
    const distance = vertical ? start.y - event.clientY : start.x - event.clientX;
    if (Math.abs(distance) > 35) {
      dragged.current = true;
      select(index + Math.sign(distance));
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
      <main className={`art-section ${all ? 'art-section-all' : ''}`} data-medium={medium}>
        <h1 className="sr-only">{all ? 'All artworks' : 'Art'}</h1>
        <nav className="art-collection-bar" aria-label="Art navigation">
            <Link className="art-text-link art-home" href="/">← Home</Link>
            <Link className="art-text-link" href={scopeHref(all ? 'selected' : 'all')}>
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
                style={center.height > 0
                  ? {'--art-frame-half-height': `${center.height / 2}px`} as CSSProperties
                  : undefined}
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
                          : index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1),
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
                  const natural = frameSize(artwork);
                  const crossAxis = stageSize.vertical ? 'width' : 'height';
                  const scale = current || !natural[crossAxis]
                    ? 1 : Math.min(1, center[crossAxis] / natural[crossAxis]);
                  const size = {width: natural.width * scale, height: natural.height * scale};
                  const axis = stageSize.vertical ? 'height' : 'width';
                  const shift = offset * (center[axis] / 2 + size[axis] * 0.4 + 20);
                  return (
                    <div
                      className="art-carousel-slide"
                      key={artwork.id}
                      data-current={current}
                      aria-hidden={!visible}
                      inert={!visible}
                      style={
                        {
                          '--offset': offset,
                          '--abs-offset': Math.abs(offset),
                          '--shift': `${shift}px`,
                          ...(size.width > 0 ? {width: size.width, height: size.height} : {}),
                          opacity: visible ? (current ? 1 : 0.48) : 0,
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
