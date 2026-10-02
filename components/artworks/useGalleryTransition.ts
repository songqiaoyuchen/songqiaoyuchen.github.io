'use client';

import {useCallback, useLayoutEffect, useRef} from 'react';

type Tile = {
  id: string;
  image: HTMLImageElement;
  rect: DOMRect;
  opacity: number;
  pose: {prefix: string; width: number; height: number};
  card?: {rect: DOMRect; background: string; border: string};
};

const timing = {duration: 760, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both'} as const;

function readCarouselMask(gallery: HTMLElement) {
  const carousel = gallery.querySelector<HTMLElement>('.art-carousel');
  return carousel ? {rect: carousel.getBoundingClientRect(), image: getComputedStyle(carousel).maskImage} : null;
}

function maskFrame(rect: DOMRect) {
  return {maskPosition: `${rect.left}px ${rect.top}px`, maskSize: `${rect.width}px ${rect.height}px`};
}

function matrix3d(matrix: DOMMatrix) {
  return `matrix3d(${Array.from(matrix.toFloat64Array()).join(',')})`;
}

function readPose(image: HTMLImageElement, slide: HTMLElement | null, rect: DOMRect): Tile['pose'] {
  const identity = matrix3d(new DOMMatrix());
  if (!slide) {
    return {width: rect.width, height: rect.height,
      prefix: `translate(0px, 0px) ${identity} translate(${rect.left}px, ${rect.top}px) ` +
        `${identity} translate(0px, 0px)`};
  }
  const carousel = slide.parentElement!;
  const bounds = carousel.getBoundingClientRect();
  const parentStyle = getComputedStyle(carousel);
  const style = getComputedStyle(slide);
  const imageStyle = getComputedStyle(image);
  const [px, py] = parentStyle.perspectiveOrigin.split(' ').map(Number.parseFloat);
  const [ox, oy] = style.transformOrigin.split(' ').map(Number.parseFloat);
  const perspective = new DOMMatrix();
  perspective.m34 = -1 / Number.parseFloat(parentStyle.perspective);
  // Reproduce the carousel's projection and transform origins, rather than its
  // axis-aligned bounding box, which loses the side cards' actual tilted shape.
  return {width: Number.parseFloat(imageStyle.width), height: Number.parseFloat(imageStyle.height),
    prefix: `translate(${bounds.left + px}px, ${bounds.top + py}px) ${matrix3d(perspective)} ` +
      `translate(${Number.parseFloat(style.left) + ox - px}px, ${Number.parseFloat(style.top) + oy - py}px) ` +
      `${matrix3d(new DOMMatrix(style.transform))} translate(${image.offsetLeft - ox}px, ${image.offsetTop - oy}px)`};
}

function readTiles(gallery: HTMLElement): Tile[] {
  const carousel = gallery.querySelector('.art-carousel')?.getBoundingClientRect();
  return Array.from(gallery.querySelectorAll<HTMLElement>('[data-artwork-id]')).flatMap((tile) => {
    const image = tile.querySelector('img');
    const slide = tile.closest<HTMLElement>('.art-carousel-slide');
    if (!image || slide?.inert) return [];
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= window.innerHeight ||
      rect.right <= 0 || rect.left >= window.innerWidth) return [];
    if (carousel && (rect.bottom <= carousel.top || rect.top >= carousel.bottom ||
      rect.right <= carousel.left || rect.left >= carousel.right)) return [];
    const card = tile.querySelector<HTMLElement>('.art-grid-image');
    const style = card ? getComputedStyle(card) : null;
    return [{id: tile.dataset.artworkId!, image, rect, pose: readPose(image, slide, rect),
      card: card && style ? {rect: card.getBoundingClientRect(),
        background: style.backgroundColor, border: style.border} : undefined,
      opacity: slide ? Number(getComputedStyle(slide).opacity) : 1}];
  });
}

function transform(from: DOMRect, to: DOMRect) {
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) ` +
    `scale(${to.width / from.width}, ${to.height / from.height})`;
}

function position(element: HTMLElement, rect: DOMRect) {
  Object.assign(element.style, {position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`, transformOrigin: '0 0'});
}

function imageTransform(tile: Tile, image: HTMLImageElement) {
  const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
  const {prefix, width: planeWidth, height: planeHeight} = tile.pose;
  const width = Math.min(planeWidth, planeHeight * ratio);
  const height = width / ratio;
  return `${prefix} translate(${(planeWidth - width) / 2}px, ${(planeHeight - height) / 2}px) scale(${width / 1000})`;
}

// Snapshot before navigation; animate viewport images once the new layout has
// settled. Live artwork links remain semantic, focusable HTML.
export function useGalleryTransition(all: boolean) {
  const root = useRef<HTMLElement>(null);
  const pending = useRef<{
    all: boolean;
    tiles: Tile[];
    mask: ReturnType<typeof readCarouselMask>;
  } | null>(null);
  const stop = useRef<(() => void) | null>(null);

  const capture = useCallback(() => {
    stop.current?.();
    pending.current = null;
    if (!root.current) return;
    const tiles = readTiles(root.current);
    if (tiles.length) pending.current = {all, tiles, mask: readCarouselMask(root.current)};
  }, [all]);

  useLayoutEffect(() => {
    // popstate fires before React applies the destination route.
    const onPopState = () => {
      const path = window.location.pathname.replace(/\/+$/, '');
      if ((path.endsWith('/artworks') || path.endsWith('/artworks/all')) &&
        path.endsWith('/all') !== all) capture();
    };
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
      const destination = readTiles(gallery);
      if (!destination.length) { cleanup(); return; }
      const destinationMask = readCarouselMask(gallery);
      const mask = source.mask ?? destinationMask;
      if (mask) {
        // Keep the fade in viewport coordinates, as on the real carousel. Its
        // bounds expand beyond the viewport so the grid ends completely clear;
        // reversing restores both the edge gradient and carousel clipping.
        const clear = new DOMRect(-window.innerWidth * 0.2, -window.innerHeight * 0.2,
          window.innerWidth * 1.4, window.innerHeight * 1.4);
        layer.style.maskImage = mask.image;
        layer.style.maskRepeat = 'no-repeat';
        animations.push(layer.animate([
          maskFrame(source.mask?.rect ?? clear),
          maskFrame(destinationMask?.rect ?? clear),
        ], timing));
      }
      const from = new Map(source.tiles.map((tile) => [tile.id, tile]));
      const to = new Map(destination.map((tile) => [tile.id, tile]));
      const sourceAnchor = source.tiles.reduce((a, b) => a.opacity >= b.opacity ? a : b);
      const targetAnchor = destination.reduce((a, b) => a.opacity >= b.opacity ? a : b);

      for (const id of new Set([...from.keys(), ...to.keys()])) {
        const start = from.get(id);
        const end = to.get(id);
        const first = start ?? sourceAnchor;
        const last = end ?? targetAnchor;
        if (start?.card) {
          const card = document.createElement('div');
          position(card, start.card.rect);
          Object.assign(card.style, {background: start.card.background, border: start.card.border});
          layer.append(card);
          animations.push(card.animate([
            {transform: 'none', opacity: 1},
            {transform: transform(start.card.rect, last.rect), opacity: 0},
          ], timing));
        }
        const original = (start ?? end)!.image;
        const image = original.cloneNode() as HTMLImageElement;
        // Keep the loaded source stable while presentation size changes.
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.src = original.currentSrc || original.src;
        image.loading = 'eager';
        image.alt = '';
        // Give both endpoints the artwork's intrinsic ratio. A new tile can
        // originate at another artwork's position without inheriting its shape.
        const ratio = Number(original.getAttribute('width')) / Number(original.getAttribute('height'));
        position(image, new DOMRect(0, 0, 1000, 1000 / ratio));
        image.style.objectFit = 'contain';
        layer.append(image);
        if (end) {
          end.image.style.visibility = 'hidden';
          hiddenImages.push(end.image);
        }
        animations.push(image.animate([
          {transform: imageTransform(first, original), opacity: start?.opacity ?? 0},
          {transform: imageTransform(last, original), opacity: end?.opacity ?? 0},
        ], timing));
      }

      gallery.querySelectorAll<HTMLElement>('.art-grid-work, .art-medium-title, .art-medium-nav, .art-caption')
        .forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
          const isCard = element.classList.contains('art-grid-work');
          const origin = from.get(element.dataset.artworkId ?? '') ?? sourceAnchor;
          animations.push(element.animate([
            {opacity: 0, transform: isCard ? transform(rect, origin.rect) : 'translateY(12px)',
              transformOrigin: '0 0'},
            {opacity: 1, transform: 'none', transformOrigin: '0 0'},
          ], isCard ? timing : {...timing, duration: 580, delay: 120}));
        });
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
