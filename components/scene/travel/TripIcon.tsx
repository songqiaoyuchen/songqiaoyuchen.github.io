// A trip's own marker in place of the diamond (TravelCallouts), drawn at three levels of detail that the marker's
// state picks between (TravelCallouts.css): the plain mark over all trips, a little more in focus, the full drawing
// with the trip open, up close. Line drawings on a 24 unit grid in the signal colour.
import type {ReactNode} from 'react';
import type {TripIcon as TripIconName} from '@/data/travel';

type Detail = 'small' | 'focus' | 'open';

const DRAWINGS: Record<TripIconName, Record<Detail, ReactNode>> = {
  // Mont Ventoux: the bald hill and its summit station; up close, the station's mast and the road winding up to it,
  // its bends widening on the way down.
  ventoux: {
    small: (
      <>
        <path d="M1 21C6 19 9 13 12 12c3 1 7 6 11 9" />
        <path d="M12 12V3" />
      </>
    ),
    focus: (
      <>
        <path d="M1 21C6 19 8.5 14 10.5 12.5h3c2.5 1.5 6 5.5 9.5 8.5" fill="currentColor" fillOpacity={0.25} />
        <path d="M10.5 12.5V10h3v2.5" />
        <path d="M12 10V2.5" />
      </>
    ),
    open: (
      <>
        <path d="M1.5 21.5Q7.5 16.5 11 10.6M13 10.6Q16.5 16.5 22.5 21.5" />
        <path
          d="M12 10.8C13.5 11.4 13.4 12.1 12 12.6C10.2 13.3 10.2 14 12 14.5C15 15.3 15 16.3 12 16.9C8.4 17.6 8.3 18.9 12
            19.4C14.5 19.8 15.8 20 17 20.2"
        />
        <rect fill="currentColor" height="5.6" stroke="none" width="2" x="11" y="5" />
        <path d="M12 5V1" />
        <rect fill="currentColor" height="1.6" stroke="none" width="0.9" x="11.55" y="2" />
      </>
    ),
  },
  // Alpe d'Huez: the hairpins, uneven as the road is; up close, a dozen of them up a faint slope.
  hairpins: {
    small: <path d="M3 22l14-2.5-9-3 12-3-10-3.5 8-2.5-7-3" />,
    focus: <path d="M3 22l14-2.5-9-3 12-3-10-3.5 8-2.5-7-3" />,
    open: (
      <>
        <path d="M2 22.5l13-1.6-8-1.7 12-1.6-10-1.9 9.5-1.4-7.5-1.8 10-1.5-8.5-1.9 6.5-1.3-5-1.6 6-1.2" />
        <path d="M1 23C7 18 14 9 22 2" strokeOpacity={0.25} />
      </>
    ),
  },
};

export function TripIcon({name}: {name: TripIconName}) {
  return (
    <span className="travel-trip-icon">
      {(['small', 'focus', 'open'] as const).map((detail) => (
        <svg
          data-detail={detail}
          fill="none"
          key={detail}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          {DRAWINGS[name][detail]}
        </svg>
      ))}
    </span>
  );
}
