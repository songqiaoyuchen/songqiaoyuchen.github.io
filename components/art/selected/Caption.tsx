// Wall label under the carousel: the live label, the outgoing one fading out, and the "All works" link.
// Spans the widest selected work's edges so it never moves between works (Caption.css).
import type {CSSProperties, ReactNode} from 'react';
import {FEATURED_ARTWORKS, type Artwork} from '@/data/artworks';
import {frameSize} from '@/lib/art/carouselLayout';
import {WallLabel} from '../label/WallLabel';
import type {StageSize} from './useCarouselMotion';

// The wall label spans the widest selected work's edges, so it holds still
// while works of other proportions pass above it.
function captionInset(stage: StageSize) {
  if (!stage.width) return undefined;
  const widest = Math.max(...FEATURED_ARTWORKS.map((artwork) => frameSize(artwork, stage).width));
  return {'--art-work-inset': `${Math.max(0, (stage.width - widest) / 2)}px`} as CSSProperties;
}

type CaptionProps = {
  selected: Artwork;
  index: number;
  leaving: Artwork | null;
  stageSize: StageSize;
  onLeft: () => void;
  scopeLink: ReactNode;
};

export function Caption({selected, index, leaving, stageSize, onLeft, scopeLink}: CaptionProps) {
  return (
    <div className="art-caption" style={captionInset(stageSize)}>
      <div className="art-caption-live" aria-live="polite" aria-atomic="true">
        <div className="art-caption-item" key={selected.id}>
          <span className="sr-only">Work {index + 1} of {FEATURED_ARTWORKS.length}. </span>
          <WallLabel artwork={selected} />
        </div>
      </div>
      {leaving && leaving !== selected && (
        <div className="art-caption-item" data-leaving="" key={`leaving-${leaving.id}`}
          aria-hidden="true" inert
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) onLeft();
          }}>
          <WallLabel artwork={leaving} />
        </div>
      )}
      {/* After the label in reading order; shares the title's baseline. */}
      <div className="art-caption-scope">{scopeLink}</div>
    </div>
  );
}
