import { HOME_SECTIONS } from '@/data/homeSections';
import type { SectionId } from '@/data/homeSections';

const SVG_W = 1000;
const SVG_H = 600;
const N = 24;

function makeContourPath(y: number, amp: number, phase: number): string {
  const count = 64;
  const pts = Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const x = t * SVG_W;
    const dy =
      amp * (0.62 * Math.sin(phase + t * Math.PI * 2.3) +
             0.38 * Math.sin(phase * 1.7 + t * Math.PI * 5.1));
    return `${x.toFixed(1)},${(y + dy).toFixed(2)}`;
  });
  return `M ${pts[0]} L ${pts.slice(1).join(' ')}`;
}

const contours = Array.from({ length: N }, (_, i) => {
  const t = i / (N - 1);
  const y = SVG_H * 0.02 + t * SVG_H * 0.96;
  const amp = 2.5 + t * 13;
  const phase = i * 2.17;
  const opacity = 0.03 + t * 0.63;
  const sw = 0.30 + t * 0.80;
  return { y, amp, phase, opacity, sw };
});

type Props = {
  activeSection: SectionId | null;
};

export function TerrainBackgroundPlaceholder({ activeSection }: Props) {
  return (
    <div>
      <div >
        <div >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="tc-fog" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#080806" stopOpacity="1" />
                <stop offset="30%"  stopColor="#080806" stopOpacity="0.75" />
                <stop offset="62%"  stopColor="#080806" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#080806" stopOpacity="0" />
              </linearGradient>
            </defs>

            {contours.map((c, i) => (
              <path
                key={i}
                d={makeContourPath(c.y, c.amp, c.phase)}
                stroke={`rgba(200,168,116,${c.opacity.toFixed(3)})`}
                strokeWidth={c.sw}
                fill="none"
              />
            ))}

            <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#tc-fog)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
