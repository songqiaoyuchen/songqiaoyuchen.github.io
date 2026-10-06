// DOM measurement for the gallery transition: tiles (image + pose), carousel mask and collection slots.
import type {Pose} from './matrix';

// Clones are laid out CLONE px wide and scaled into place by their matrices.
export const CLONE = 1000;

export type Tile = {
  id: string;
  image: HTMLImageElement;
  rect: DOMRect;
  opacity: number;
  pose: Pose;
  carousel: boolean;
  card?: {rect: DOMRect; background: string; border: string};
};

export function readCarouselMask(gallery: HTMLElement) {
  const carousel = gallery.querySelector<HTMLElement>('.art-carousel');
  return carousel ? {rect: carousel.getBoundingClientRect(), image: getComputedStyle(carousel).maskImage} : null;
}

export function maskFrame(rect: DOMRect) {
  return {maskPosition: `${rect.left}px ${rect.top}px`, maskSize: `${rect.width}px ${rect.height}px`};
}

// Fit the artwork's intrinsic ratio inside a box and scale the CLONE-wide image into it.
function contain(image: HTMLImageElement, width: number, height: number) {
  const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height')) || width / height;
  const fitted = Math.min(width, height * ratio);
  return new DOMMatrix().translate((width - fitted) / 2, (height - fitted / ratio) / 2).scale(fitted / CLONE);
}

export function boxPose(image: HTMLImageElement, rect: DOMRect): Pose {
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

export function readCard(tile: HTMLElement) {
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

export function readTiles(gallery: HTMLElement): Tile[] {
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
export function readLayout(gallery: HTMLElement) {
  return new Map(Array.from(gallery.querySelectorAll<HTMLElement>('.art-grid-work[data-artwork-id]'))
    .flatMap((work) => {
      const image = work.querySelector('img');
      return image ? [[work.dataset.artworkId!, image.getBoundingClientRect()] as const] : [];
    }));
}

export function position(element: HTMLElement, rect: DOMRect) {
  Object.assign(element.style, {position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`, transformOrigin: '0 0'});
}
