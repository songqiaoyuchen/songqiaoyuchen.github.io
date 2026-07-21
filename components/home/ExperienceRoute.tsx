import type { RefObject } from 'react';
import {
  catmullRomPath,
  EXPERIENCE_ROUTE_POINTS,
} from '@/config/homeScroll';

type Props = {
  layerRef: RefObject<HTMLDivElement | null>;
  pathRef: RefObject<SVGPathElement | null>;
};

export function ExperienceRoute({ layerRef, pathRef }: Props) {
  const routePath = catmullRomPath(EXPERIENCE_ROUTE_POINTS);

  return (
    <div
      ref={layerRef}
      className="pointer-events-none absolute inset-0 z-30 flex items-center opacity-0"
      aria-hidden
    >
      <div className="relative w-full">
        <p className="absolute left-[9%] top-[-18px] font-mono text-[9px] uppercase tracking-[0.24em] text-dim md:text-[10px]">
          Experience route · 2019—present
        </p>
        <svg
          viewBox="0 0 1000 600"
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label="Experience timeline from 2019 to the present"
        >
          <path
            ref={pathRef}
            d={routePath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {EXPERIENCE_ROUTE_POINTS.map((point, index) => {
            const labelAbove = index % 2 === 0;
            const labelAnchor = index === 0
              ? 'start'
              : index === EXPERIENCE_ROUTE_POINTS.length - 1
                ? 'end'
                : 'middle';
            return (
              <g
                key={point.year}
                className="experience-station"
                style={{ transformOrigin: `${point.x}px ${point.y}px` }}
              >
                <circle
                  className="experience-ripple"
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  style={{ animationDelay: `${index * 0.55}s` }}
                />
                <circle cx={point.x} cy={point.y} r="5" fill="var(--color-accent)" />
                <line
                  x1={point.x}
                  y1={point.y + (labelAbove ? -10 : 10)}
                  x2={point.x}
                  y2={point.y + (labelAbove ? -34 : 34)}
                  stroke="rgba(242,238,230,.34)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={point.x}
                  y={point.y + (labelAbove ? -46 : 55)}
                  textAnchor="middle"
                  className="fill-text font-mono text-[14px] tracking-[0.12em]"
                >
                  {point.year}
                </text>
                <text
                  x={point.x}
                  y={point.y + (labelAbove ? -67 : 76)}
                  textAnchor={labelAnchor}
                  className="fill-muted font-mono text-[11px] uppercase tracking-[0.08em]"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
