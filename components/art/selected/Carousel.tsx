// Selected works carousel: a 3D ring of featured artworks (horizontal on desktop, vertical on touch).
// Motion and input live in useCarouselMotion/useCarouselInput; styles in Carousel.css.
import type {RefObject} from 'react';
import {FEATURED_ARTWORKS} from '@/data/artworks';
import {carouselLayout} from '@/lib/art/carouselLayout';
import {CarouselSlide} from './CarouselSlide';
import {SwipeRail} from './SwipeRail';
import type {useCarouselInput} from './useCarouselInput';

// Server and first client render, before the stage is measured.
const INITIAL_POSES = carouselLayout(FEATURED_ARTWORKS.map(() => ({width: 0, height: 0})), 0, false).slides;

type CarouselProps = {
  index: number;
  query: string;
  stageRef: RefObject<HTMLDivElement | null>;
  stageHandlers: ReturnType<typeof useCarouselInput>['stageHandlers'];
  onSelect: (index: number) => void;
  onStep: (direction: -1 | 1) => void;
  onOpen: (id: string) => void;
};

export function Carousel({index, query, stageRef, stageHandlers, onSelect, onStep, onOpen}: CarouselProps) {
  return (
    <div className="art-stage">
      <div
        className="art-carousel"
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Selected works. Use arrow keys or scroll to browse."
        tabIndex={0}
        {...stageHandlers}
      >
        {FEATURED_ARTWORKS.map((artwork, artworkIndex) => {
          let offset = (artworkIndex - index + FEATURED_ARTWORKS.length) % FEATURED_ARTWORKS.length;
          if (offset > FEATURED_ARTWORKS.length / 2) offset -= FEATURED_ARTWORKS.length;
          return (
            <CarouselSlide
              key={artwork.id}
              artwork={artwork}
              current={offset === 0}
              visible={Math.abs(offset) <= 1}
              priority={artworkIndex === 0}
              // Constant across renders: the position spring owns the live pose.
              initial={INITIAL_POSES[artworkIndex]}
              href={`/artworks/${artwork.id}${query}`}
              onOpen={() => onOpen(artwork.id)}
              onSelect={() => onSelect(artworkIndex)}
            />
          );
        })}
      </div>
      <SwipeRail index={index} count={FEATURED_ARTWORKS.length} onStep={onStep} />
    </div>
  );
}
