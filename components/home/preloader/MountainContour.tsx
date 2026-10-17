// Preloader mark: faint mountain contour rings (lib/intro/markPaths.ts) with one bright segment spiralling through
// them (Preloader.css).
import {MARK_PATHS, MARK_VIEW_BOX} from '@/lib/intro/markPaths';

const CONTOUR_SPIRAL_PATH = MARK_PATHS.join(' ');

export function MountainContour() {
  const {x, y, width, height} = MARK_VIEW_BOX;
  return (
    <svg aria-hidden="true" className="preloader-mountain-icon" viewBox={`${x} ${y} ${width} ${height}`}>
      <g className="preloader-mountain-base">
        {MARK_PATHS.map((path) => (
          <path d={path} key={path} pathLength="1" />
        ))}
      </g>
      <path className="preloader-mountain-spiral" d={CONTOUR_SPIRAL_PATH} pathLength="1" />
    </svg>
  );
}
