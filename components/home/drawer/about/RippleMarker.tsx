// Timeline dot for one About entry: state colour, ripples when activated, a pulse for the current entry.
// Ripple and pulse keyframes live in Timeline.css.
export type TimelineState = 'upcoming' | 'active' | 'passed';

interface RippleMarkerProps {
  hasContinuation?: boolean;
  isCurrent?: boolean;
  isPulsing?: boolean;
  rippleCount: number;
  state: TimelineState;
}

const MARKER_STATE: Record<TimelineState, string> = {
  upcoming: 'border-dim bg-panel/96',
  active: 'border-accent bg-accent shadow-route-marker',
  passed: 'border-muted bg-muted',
};

const RIPPLE = `pointer-events-none absolute z-1 size-2 rounded-full border-accent-soft opacity-0
  motion-reduce:hidden motion-reduce:animate-none`;

export function RippleMarker({
  hasContinuation = false,
  isCurrent = false,
  isPulsing = false,
  rippleCount,
  state,
}: RippleMarkerProps) {
  return (
    <span
      aria-hidden="true"
      className="relative grid size-8 place-items-center"
      data-current={isCurrent || undefined}
      data-pulsing={isPulsing || undefined}
      data-rippling={rippleCount > 0 || undefined}
      data-state={state}
    >
      {/* The last (oldest) entry trails off in a dashed line: the route continues. */}
      {hasContinuation && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-32 w-2
            -translate-x-1/2 overflow-visible text-accent"
          preserveAspectRatio="none"
          viewBox="0 0 8 128"
        >
          <path
            d="M4 0V128"
            fill="none"
            stroke="currentColor"
            strokeDasharray="2 6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <span
        className={`relative z-2 block size-[0.32rem] rounded-full border
          transition-[border-color,background-color,box-shadow] duration-300 ease-out
          ${MARKER_STATE[state]}`}
      />
      {rippleCount > 0 && (
        <>
          <span
            className={`${RIPPLE} animate-route-ripple-one border`}
            key={`ripple-one-${rippleCount}`}
          />
          <span
            className={`${RIPPLE} animate-route-ripple-two border`}
            key={`ripple-two-${rippleCount}`}
          />
          <span
            className={`${RIPPLE} animate-route-ripple-three border-[0.75px]`}
            key={`ripple-three-${rippleCount}`}
          />
        </>
      )}
      <span
        className={`${RIPPLE} border-[0.75px]
          ${isPulsing ? 'animate-current-signal' : ''}`}
      />
    </span>
  );
}
