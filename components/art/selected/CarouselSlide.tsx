// One carousel slide: the artwork image as a link (enlarge when current, select otherwise).
// Its pose CSS variables are written by useCarouselMotion; the inline values here are the first render.
import Image from 'next/image';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import type {Artwork} from '@/data/artworks';
import type {SlidePose} from '@/lib/art/carouselLayout';

type CarouselSlideProps = {
  artwork: Artwork;
  current: boolean;
  visible: boolean;
  priority: boolean;
  initial: SlidePose;
  href: string;
  onOpen: () => void;
  onSelect: () => void;
};

export function CarouselSlide({
  artwork, current, visible, priority, initial, href, onOpen, onSelect,
}: CarouselSlideProps) {
  return (
    <div
      className="art-carousel-slide"
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
        href={href}
        aria-label={`${current ? 'Enlarge' : 'View'} ${artwork.title}`}
        tabIndex={visible ? 0 : -1}
        data-artwork-id={artwork.id}
        onClick={(event) => {
          if (current) onOpen();
          else if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            onSelect();
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
          priority={priority}
          sizes="(max-width: 767px) 78vw, 38vw"
          draggable={false}
        />
      </Link>
    </div>
  );
}
