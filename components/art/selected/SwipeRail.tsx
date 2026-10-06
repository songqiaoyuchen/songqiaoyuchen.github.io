// Touch-only browsing rail (hidden on fine pointers via SwipeRail.css): previous/next buttons and a position marker.
import type {CSSProperties} from 'react';

type SwipeRailProps = {
  index: number;
  count: number;
  onStep: (direction: -1 | 1) => void;
};

export function SwipeRail({index, count, onStep}: SwipeRailProps) {
  return (
    <div className="art-swipe" role="group" aria-label="Browse selected works">
      <button type="button" className="art-swipe-step" aria-label="Previous artwork"
        onClick={() => onStep(-1)}>
        <span aria-hidden="true">↑</span>
      </button>
      <span className="art-swipe-track" aria-hidden="true">
        <span className="art-swipe-marker"
          style={{'--index': index, '--count': count} as CSSProperties} />
      </span>
      <button type="button" className="art-swipe-step art-swipe-next" aria-label="Next artwork"
        onClick={() => onStep(1)}>
        <span aria-hidden="true">↓</span>
      </button>
    </div>
  );
}
