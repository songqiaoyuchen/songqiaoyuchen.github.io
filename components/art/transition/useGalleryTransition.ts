// Gallery view transition (Selected <-> All works): works fall onto a tilted "table", then rise into place.
// Snapshots poses before navigation, animates clones with sampled matrix3d keyframes (GalleryTransition.css).
'use client';

import {useCallback, useLayoutEffect, useRef} from 'react';
import {animateGalleryTransition, type GallerySnapshot} from './choreography';
import {readCarouselMask, readLayout, readTiles} from './measure';

// Snapshot before navigation; once the new layout has settled, the works fall
// from their source poses onto one orthographic table, then rise from it into
// the destination layout. Live artwork links remain semantic, focusable HTML.
export function useGalleryTransition(all: boolean) {
  const root = useRef<HTMLElement>(null);
  const pending = useRef<GallerySnapshot | null>(null);
  const stop = useRef<(() => void) | null>(null);

  const capture = useCallback(() => {
    stop.current?.();
    pending.current = null;
    if (!root.current) return;
    const tiles = readTiles(root.current);
    if (tiles.length) {
      pending.current = {all, tiles, layout: readLayout(root.current), mask: readCarouselMask(root.current)};
    }
  }, [all]);

  useLayoutEffect(() => {
    const crosses = (url: string) => {
      const path = new URL(url, window.location.href).pathname.replace(/\/+$/, '');
      return (path.endsWith('/artworks') || path.endsWith('/artworks/all')) && path.endsWith('/all') !== all;
    };
    // The router can commit a cached route synchronously in its own popstate
    // listener, before this one. The Navigation API's traverse event precedes
    // it; popstate remains the fallback.
    const navigation = (window as Window & {navigation?: EventTarget}).navigation;
    if (navigation) {
      const onNavigate = (event: Event) => {
        const {navigationType, destination} = event as Event & {navigationType: string; destination: {url: string}};
        if (navigationType === 'traverse' && crosses(destination.url)) capture();
      };
      navigation.addEventListener('navigate', onNavigate);
      return () => navigation.removeEventListener('navigate', onNavigate);
    }
    const onPopState = () => { if (crosses(window.location.href)) capture(); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [all, capture]);

  useLayoutEffect(() => {
    const source = pending.current;
    const gallery = root.current;
    if (!source || source.all === all || !gallery) return;
    pending.current = null;
    if (!all) window.scrollTo({top: 0, behavior: 'instant'});
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gallery.setAttribute('data-gallery-transition', 'true');

    const animations: Animation[] = [];
    const hiddenImages: HTMLImageElement[] = [];
    const layer = document.createElement('div');
    layer.className = 'art-transition-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    document.body.append(layer);

    let frame = 0;
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
      hiddenImages.forEach((image) => image.style.removeProperty('visibility'));
      gallery.removeAttribute('data-gallery-transition');
      layer.remove();
      if (stop.current === cleanup) stop.current = null;
    };
    stop.current = cleanup;

    // Carousel measurement and medium entry scrolling finish before this frame.
    frame = requestAnimationFrame(() => {
      if (!animateGalleryTransition(gallery, source, all, layer, animations, hiddenImages)) { cleanup(); return; }
      void Promise.all(animations.map((animation) => animation.finished)).then(cleanup, cleanup);
    });

    // Input or resizing invalidates endpoints; reveal the live layout at once.
    window.addEventListener('resize', cleanup, {once: true});
    window.addEventListener('wheel', cleanup, {once: true, passive: true});
    window.addEventListener('touchstart', cleanup, {once: true, passive: true});
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', cleanup);
      window.removeEventListener('wheel', cleanup);
      window.removeEventListener('touchstart', cleanup);
      cleanup();
    };
  }, [all]);

  return {galleryRef: root, captureGallery: capture};
}
