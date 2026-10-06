// Choreography of the gallery transition: builds the table, then animates mask, card boxes, artwork
// clones and text reveals with sampled keyframes. Called by useGalleryTransition one frame after navigation.
import {GALLERY_TRANSITION_CONFIG} from '@/config/art/galleryTransition';
import {bezier, clamp01, compose, css, decompose, lerp, matrix3d, mixParts, screen, slerp} from './matrix';
import {
  boxPose, CLONE, maskFrame, position, readCard, readCarouselMask, readLayout, readTiles, type Tile,
} from './measure';

const {
  durationMs: DURATION, steps: STEPS, depart: DEPART, rest: REST, stagger: STAGGER, table: TABLE,
  departCurve: DEPART_CURVE, arriveCurve: ARRIVE_CURVE,
} = GALLERY_TRANSITION_CONFIG;

/** Poses captured from the outgoing view just before navigation. */
export type GallerySnapshot = {
  all: boolean;
  tiles: Tile[];
  layout: Map<string, DOMRect>;
  mask: ReturnType<typeof readCarouselMask>;
};

/**
 * Starts every animation of one transition into `layer`, collecting them in `animations` and the live
 * images it hides in `hiddenImages`. Returns false when the new view shows no works (nothing to animate).
 */
export function animateGalleryTransition(
  gallery: HTMLElement,
  source: GallerySnapshot,
  all: boolean,
  layer: HTMLElement,
  animations: Animation[],
  hiddenImages: HTMLImageElement[],
) {
  const destination = readTiles(gallery);
  if (!destination.length) return false;
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
  return true;
}
