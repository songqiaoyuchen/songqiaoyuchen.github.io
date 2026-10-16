// The × that closes a routed section (Art, Places) back to Home, like the About drawer's close.
'use client';

import Link from 'next/link';
import {requestSectionNavigation} from './Nav';
import {closeMark} from './close.styles';

interface SectionCloseProps {
  /** The section's name, for the accessible label. */
  label: string;
  /** Placement, from the section's own stylesheet. */
  className?: string;
}

export function SectionClose({label, className = ''}: SectionCloseProps) {
  return (
    <Link
      aria-label={`Close ${label.toLowerCase()}`}
      className={`${closeMark} ${className}`}
      href="/"
      // The shell fades the section out and starts the camera home, as a nav link does.
      onClick={(event) => requestSectionNavigation(event, '/')}
    >
      <span aria-hidden="true">&times;</span>
    </Link>
  );
}
