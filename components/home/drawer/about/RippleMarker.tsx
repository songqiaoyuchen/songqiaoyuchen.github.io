// Timeline dot for one About stop: state colour, ripples when activated, a pulse for the current entry.
// The open-ended "Next?" stop is a dashed ring instead of a dot. Ripple and pulse keyframes live in Timeline.css.
export type TimelineState = 'upcoming' | 'active' | 'passed';

interface RippleMarkerProps {
  isCurrent?: boolean;
  isOpenEnd?: boolean;
  isPulsing?: boolean;
  rippleCount: number;
  state: TimelineState;
}

const MARKER_STATE: Record<TimelineState, string> = {
  upcoming: 'border-dim bg-panel/96',
  active: 'border-accent bg-accent shadow-route-marker',
  passed: 'border-muted bg-muted',
};

const OPEN_END_STATE: Record<TimelineState, string> = {
  upcoming: 'border-dim',
  active: 'border-accent shadow-route-marker',
  passed: 'border-accent',
};

const RIPPLE = `pointer-events-none absolute z-1 size-2 rounded-full border-accent-soft opacity-0
  motion-reduce:hidden motion-reduce:animate-none`;

export function RippleMarker({
  isCurrent = false,
  isOpenEnd = false,
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
      <span
        className={isOpenEnd
          ? `relative z-2 block size-2.5 rounded-full border border-dashed bg-panel/96
            transition-[border-color,box-shadow] duration-300 ease-out ${OPEN_END_STATE[state]}`
          : `relative z-2 block size-[0.32rem] rounded-full border
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
