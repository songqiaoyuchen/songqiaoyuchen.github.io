'use client';

import {useCallback, useLayoutEffect, useRef} from 'react';

// Screen matrix = translate(x, y) · perspective(m34) · model, for a CLONE-wide image.
type Pose = {x: number; y: number; m34: number; model: DOMMatrix};

type Tile = {
  id: string;
  image: HTMLImageElement;
  rect: DOMRect;
  opacity: number;
  pose: Pose;
  carousel: boolean;
  card?: {rect: DOMRect; background: string; border: string};
};

type Parts = {t: number[]; q: number[]; s: number[]};

const CLONE = 1000;
const DURATION = 1120;
const STEPS = 64;
// Tiles leave the source until DEPART, rest on the table, then rise after REST.
const DEPART = 0.42;
const REST = 0.52;
const STAGGER = 0.22;
const TABLE = 'rotateX(56deg) rotateZ(-45deg)';
const DEPART_CURVE = [0.55, 0, 0.3, 1] as const;
const ARRIVE_CURVE = [0.4, 0, 0.16, 1] as const;
const css = (curve: readonly number[]) => `cubic-bezier(${curve.join(', ')})`;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function bezier([x1, y1, x2, y2]: readonly number[]) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      if (at(x1, x2, mid) < x) low = mid;
      else high = mid;
    }
    return at(y1, y2, (low + high) / 2);
  };
}

// Affine matrix → translation, rotation quaternion and axis scales (no shear).
function decompose(m: DOMMatrix): Parts {
  const columns = [[m.m11, m.m12, m.m13], [m.m21, m.m22, m.m23], [m.m31, m.m32, m.m33]];
  const s = columns.map((column) => Math.hypot(...column) || 1);
  const det = m.m11 * (m.m22 * m.m33 - m.m23 * m.m32) - m.m21 * (m.m12 * m.m33 - m.m13 * m.m32) +
    m.m31 * (m.m12 * m.m23 - m.m13 * m.m22);
  if (det < 0) s[0] = -s[0];
  const [[r00, r10, r20], [r01, r11, r21], [r02, r12, r22]] = columns.map((column, i) => column.map((v) => v / s[i]));
  const trace = r00 + r11 + r22;
  let q: number[];
  if (trace > 0) {
    const k = Math.sqrt(trace + 1) * 2;
    q = [(r21 - r12) / k, (r02 - r20) / k, (r10 - r01) / k, k / 4];
  } else if (r00 > r11 && r00 > r22) {
    const k = Math.sqrt(1 + r00 - r11 - r22) * 2;
    q = [k / 4, (r01 + r10) / k, (r02 + r20) / k, (r21 - r12) / k];
  } else if (r11 > r22) {
    const k = Math.sqrt(1 + r11 - r00 - r22) * 2;
    q = [(r01 + r10) / k, k / 4, (r12 + r21) / k, (r02 - r20) / k];
  } else {
    const k = Math.sqrt(1 + r22 - r00 - r11) * 2;
    q = [(r02 + r20) / k, (r12 + r21) / k, k / 4, (r10 - r01) / k];
  }
  return {t: [m.m41, m.m42, m.m43], q, s};
}

function compose({t, q: [x, y, z, w], s}: Parts) {
  return new DOMMatrix([
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ]);
}

function slerp(a: number[], b: number[], t: number) {
  let dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const sign = dot < 0 ? -1 : 1;
  dot *= sign;
  if (dot > 0.9995) {
    const q = a.map((v, i) => lerp(v, sign * b[i], t));
    const length = Math.hypot(...q);
    return q.map((v) => v / length);
  }
  const angle = Math.acos(dot);
  const wa = Math.sin((1 - t) * angle) / Math.sin(angle);
  const wb = sign * Math.sin(t * angle) / Math.sin(angle);
  return a.map((v, i) => v * wa + b[i] * wb);
}

function mixParts(a: Parts, b: Parts, t: number): Parts {
  return {t: a.t.map((v, i) => lerp(v, b.t[i], t)), q: slerp(a.q, b.q, t), s: a.s.map((v, i) => lerp(v, b.s[i], t))};
}

function screen({x, y, m34, model}: Pose) {
  const perspective = new DOMMatrix();
  perspective.m34 = m34;
  return new DOMMatrix().translate(x, y).multiply(perspective).multiply(model);
}

function matrix3d(matrix: DOMMatrix) {
  return `matrix3d(${Array.from(matrix.toFloat64Array()).join(',')})`;
}

function readCarouselMask(gallery: HTMLElement) {
  const carousel = gallery.querySelector<HTMLElement>('.art-carousel');
  return carousel ? {rect: carousel.getBoundingClientRect(), image: getComputedStyle(carousel).maskImage} : null;
}

function maskFrame(rect: DOMRect) {
  return {maskPosition: `${rect.left}px ${rect.top}px`, maskSize: `${rect.width}px ${rect.height}px`};
}

// Fit the artwork's intrinsic ratio inside a box and scale the CLONE-wide image into it.
function contain(image: HTMLImageElement, width: number, height: number) {
  const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height')) || width / height;
  const fitted = Math.min(width, height * ratio);
  return new DOMMatrix().translate((width - fitted) / 2, (height - fitted / ratio) / 2).scale(fitted / CLONE);
}

function boxPose(image: HTMLImageElement, rect: DOMRect): Pose {
  return {x: 0, y: 0, m34: 0,
    model: new DOMMatrix().translate(rect.left, rect.top).multiply(contain(image, rect.width, rect.height))};
}

function readPose(image: HTMLImageElement, slide: HTMLElement | null, rect: DOMRect): Pose {
  if (!slide) return boxPose(image, rect);
  const carousel = slide.parentElement!;
  const bounds = carousel.getBoundingClientRect();
  const parentStyle = getComputedStyle(carousel);
  const style = getComputedStyle(slide);
  const imageStyle = getComputedStyle(image);
  const [px, py] = parentStyle.perspectiveOrigin.split(' ').map(Number.parseFloat);
  const [ox, oy] = style.transformOrigin.split(' ').map(Number.parseFloat);
  const depth = Number.parseFloat(parentStyle.perspective);
  // Reproduce the carousel's projection and transform origins, rather than its
  // axis-aligned bounding box, which loses the side cards' actual tilted shape.
  return {x: bounds.left + px, y: bounds.top + py, m34: depth > 0 ? -1 / depth : 0,
    model: new DOMMatrix()
      .translate(Number.parseFloat(style.left) + ox - px, Number.parseFloat(style.top) + oy - py)
      .multiply(new DOMMatrix(style.transform))
      .translate(image.offsetLeft - ox, image.offsetTop - oy)
      .multiply(contain(image, Number.parseFloat(imageStyle.width), Number.parseFloat(imageStyle.height)))};
}

function readCard(tile: HTMLElement) {
  const card = tile.querySelector<HTMLElement>('.art-grid-image');
  if (!card) return undefined;
  const style = getComputedStyle(card);
  // Borderless, transparent cards have nothing to fade.
  const background = /^(transparent|rgba\(.*,\s*0\))$/.test(style.backgroundColor) ? '' : style.backgroundColor;
  const bordered = ['Top', 'Right', 'Bottom', 'Left'].some((side) =>
    Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0);
  if (!background && !bordered) return undefined;
  return {rect: card.getBoundingClientRect(), background: background || 'transparent', border: style.border};
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
    return [{id: tile.dataset.artworkId!, image, rect, pose: readPose(image, slide, rect), carousel: !!slide,
      card: readCard(tile), opacity: slide ? Number(getComputedStyle(slide).opacity) : 1}];
  });
}

// Collection image positions, including off-screen works, give every tile a
// place on the table.
function readLayout(gallery: HTMLElement) {
  return new Map(Array.from(gallery.querySelectorAll<HTMLElement>('.art-grid-work[data-artwork-id]'))
    .flatMap((work) => {
      const image = work.querySelector('img');
      return image ? [[work.dataset.artworkId!, image.getBoundingClientRect()] as const] : [];
    }));
}

function position(element: HTMLElement, rect: DOMRect) {
  Object.assign(element.style, {position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`, transformOrigin: '0 0'});
}

// Snapshot before navigation; once the new layout has settled, the works fall
// from their source poses onto one orthographic table, then rise from it into
// the destination layout. Live artwork links remain semantic, focusable HTML.
export function useGalleryTransition(all: boolean) {
  const root = useRef<HTMLElement>(null);
  const pending = useRef<{
    all: boolean;
    tiles: Tile[];
    layout: Map<string, DOMRect>;
    mask: ReturnType<typeof readCarouselMask>;
  } | null>(null);
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
      const destination = readTiles(gallery);
      if (!destination.length) { cleanup(); return; }
      const {innerWidth: width, innerHeight: height} = window;
      const timing = {duration: DURATION, easing: 'linear', fill: 'both'} as const;
      const times = Array.from({length: STEPS + 1}, (_, i) => i / STEPS);
      const depart = bezier(DEPART_CURVE);
      const arrive = bezier(ARRIVE_CURVE);
      // Progress away from the source (0 → 1) and onto the destination (0 → 1).
      const leaving = (t: number, k = 0, spread = 0) =>
        depart(clamp01((t / DEPART - k * spread) / (1 - spread)));
      const landing = (t: number, k = 0, spread = 0) =>
        arrive(clamp01(((t - REST) / (1 - REST) - k * spread) / (1 - spread)));

      const destinationMask = readCarouselMask(gallery);
      const mask = source.mask ?? destinationMask;
      if (mask) {
        // Keep the fade in viewport coordinates, as on the real carousel. It
        // clears while tiles fall onto the table and returns as they rise into
        // the carousel, restoring both the edge gradient and its clipping.
        const clear = new DOMRect(-width * 0.2, -height * 0.2, width * 1.4, height * 1.4);
        layer.style.maskImage = mask.image;
        layer.style.maskRepeat = 'no-repeat';
        animations.push(layer.animate([
          {...maskFrame(source.mask?.rect ?? clear), offset: 0, easing: css(DEPART_CURVE)},
          {...maskFrame(clear), offset: DEPART},
          {...maskFrame(clear), offset: REST, easing: css(ARRIVE_CURVE)},
          {...maskFrame(destinationMask?.rect ?? clear), offset: 1},
        ], timing));
      }

      // The table lays the collection's arrangement flat, axonometrically and
      // without perspective, scaled to fit around the viewport centre.
      const layout = all ? readLayout(gallery) : source.layout;
      const grid = (all ? destination : source.tiles).map((tile) => tile.rect);
      const left = Math.min(...grid.map((rect) => rect.left));
      const right = Math.max(...grid.map((rect) => rect.right));
      const top = Math.min(...grid.map((rect) => rect.top));
      const bottom = Math.max(...grid.map((rect) => rect.bottom));
      const centre = {x: (left + right) / 2, y: (top + bottom) / 2};
      const tilt = new DOMMatrix(TABLE);
      const corners = [[left, top], [right, top], [left, bottom], [right, bottom]]
        .map(([x, y]) => tilt.transformPoint(new DOMPoint(x - centre.x, y - centre.y)));
      const span = (axis: 'x' | 'y') =>
        Math.max(...corners.map((p) => p[axis])) - Math.min(...corners.map((p) => p[axis])) || 1;
      const scale = Math.min(1, width * 0.84 / span('x'), height * 0.56 / span('y'));
      const tiltParts = decompose(tilt);
      // Rigidly fold the collection layout (0) down onto the table (1).
      const table = (u: number) => compose({
        t: [lerp(centre.x, width / 2, u), lerp(centre.y, height / 2, u), 0],
        q: slerp([0, 0, 0, 1], tiltParts.q, u),
        s: [lerp(1, scale, u), lerp(1, scale, u), 1],
      }).translate(-centre.x, -centre.y);
      const flat = table(1);

      const from = new Map(source.tiles.map((tile) => [tile.id, tile]));
      const to = new Map(destination.map((tile) => [tile.id, tile]));
      // The most prominent carousel works leave first and arrive first.
      const rank = (tiles: Tile[]) => {
        const order = tiles.filter((tile) => tile.carousel).sort((a, b) => b.opacity - a.opacity);
        return new Map(order.map((tile, i) => [tile.id, i / Math.max(1, order.length - 1)]));
      };
      const sourceRank = rank(source.tiles);
      const destinationRank = rank(destination);

      // Distance from an endpoint toward the table: carousel works blend out of
      // their perspective poses one by one; collection works ride the table.
      const path = (tile: Tile, onTable: DOMMatrix) => {
        const start = screen(tile.pose);
        if (!tile.carousel) return (v: number) => v <= 0 ? start : table(v).multiply(onTable);
        const {x, y, m34} = tile.pose;
        const end = new DOMMatrix().translate(-x, -y).multiply(flat).multiply(onTable);
        const a = decompose(tile.pose.model);
        const b = decompose(end);
        return (v: number) => v <= 0 ? start : v >= 1 ? flat.multiply(onTable) :
          screen({x, y, m34: lerp(m34, 0, v), model: compose(mixParts(a, b, v))});
      };

      for (const tile of source.tiles) {
        if (!tile.card) continue;
        const {rect, background, border} = tile.card;
        const card = document.createElement('div');
        position(card, new DOMRect(0, 0, rect.width, rect.height));
        Object.assign(card.style, {background, border});
        layer.append(card);
        const onTable = new DOMMatrix().translate(rect.left, rect.top);
        animations.push(card.animate(times.map((t) => {
          const v = leaving(t);
          return {offset: t, transform: matrix3d(table(v).multiply(onTable)), opacity: 1 - v};
        }), timing));
      }

      // Paint leaving works beneath arriving ones, in destination order.
      const ids = [...source.tiles.filter((tile) => !to.has(tile.id)).map((tile) => tile.id), ...to.keys()];
      for (const id of ids) {
        const start = from.get(id);
        const end = to.get(id);
        const original = (start ?? end)!.image;
        // Off-screen collection slots sit just beyond the visible arrangement.
        const slot = layout.get(id) ?? (start ?? end)!.rect;
        const shift = slot.top >= bottom ? bottom + 24 - slot.top : slot.bottom <= top ? top - 24 - slot.bottom : 0;
        const onTable = boxPose(original, new DOMRect(slot.left, slot.top + shift, slot.width, slot.height)).model;
        const plane = flat.multiply(onTable);
        const out = start && path(start, onTable);
        const into = end && path(end, onTable);
        const outRank = sourceRank.get(id) ?? 0;
        const intoRank = destinationRank.get(id) ?? 0;

        const image = original.cloneNode() as HTMLImageElement;
        // Keep the loaded source stable while presentation size changes.
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.src = original.currentSrc || original.src;
        image.loading = 'eager';
        image.alt = '';
        // Give every pose the artwork's intrinsic ratio, including works that
        // only join or leave the table.
        const ratio = Number(original.getAttribute('width')) / Number(original.getAttribute('height')) ||
          original.naturalWidth / original.naturalHeight || 1;
        position(image, new DOMRect(0, 0, CLONE, CLONE / ratio));
        // Preflight's max-width would shrink the CLONE-wide image on narrow screens.
        Object.assign(image.style, {objectFit: 'contain', maxWidth: 'none', maxHeight: 'none'});
        // The carousel's current work stays above its neighbours.
        const prominence = Math.max(...[start, end].map((tile) => tile?.carousel ? tile.opacity : 0));
        image.style.zIndex = `${Math.round(prominence * 100)}`;
        layer.append(image);
        if (end) {
          end.image.style.visibility = 'hidden';
          hiddenImages.push(end.image);
        }

        animations.push(image.animate(times.map((t) => {
          let matrix = plane;
          let opacity: number;
          if (t < REST) {
            const v = start ? leaving(t, outRank, start.carousel ? STAGGER : 0) : 1;
            if (out) matrix = out(v);
            // Works without a destination fade as they settle; new ones
            // appear on the table while the others land.
            opacity = !start ? clamp01((t - DEPART * 0.6) / (REST - DEPART * 0.6)) :
              end ? lerp(start.opacity, 1, v) : start.opacity * (1 - clamp01((v - 0.3) / 0.7));
          } else {
            const v = end ? landing(t, intoRank, end.carousel ? STAGGER : 0) : 0;
            if (into) matrix = into(1 - v);
            opacity = end ? lerp(1, end.opacity, v) : 0;
          }
          return {offset: t, transform: matrix3d(matrix), opacity};
        }), timing));
      }

      // Text never tilts or scales: captions, titles and navigation fade up
      // once the works land. Only a visible card box rides the table.
      const visible = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < height ? rect : null;
      };
      const reveal = (element: HTMLElement) => {
        if (!visible(element)) return;
        animations.push(element.animate([
          {opacity: 0, translate: '0 10px', offset: 0},
          {opacity: 0, translate: '0 10px', offset: 0.8, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'},
          {opacity: 1, translate: '0 0', offset: 1},
        ], timing));
      };
      gallery.querySelectorAll<HTMLElement>('.art-grid-work').forEach((work) => {
        for (const child of Array.from(work.children)) {
          if (!(child instanceof HTMLElement)) continue;
          if (!child.matches('img') && !child.querySelector('img')) reveal(child);
        }
        const card = work.querySelector<HTMLElement>('.art-grid-image');
        const rect = card && readCard(work) && visible(card);
        if (!card || !rect) return;
        const local = (matrix: DOMMatrix) => matrix3d(new DOMMatrix()
          .translate(-rect.left, -rect.top).multiply(matrix).translate(rect.left, rect.top));
        animations.push(card.animate(times.map((t) => ({
          offset: t,
          transform: local(table(1 - landing(t))),
          transformOrigin: '0 0',
          opacity: clamp01(((t - REST) / (1 - REST) - 0.1) / 0.5),
        })), timing));
      });
      gallery.querySelectorAll<HTMLElement>('.art-medium-title, .art-medium-nav, .art-caption').forEach(reveal);
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
