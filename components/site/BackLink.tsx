// "← All …": the link back to a section's overview, at the top of what it leaves (a location, an article), so it is
// always in view however long the content runs.
import Link from 'next/link';
import type {CSSProperties, ReactNode} from 'react';
import {pageStyles} from './page.styles';

type BackLinkProps = {href: string; children: ReactNode; className?: string; style?: CSSProperties};

export function BackLink({href, children, className = '', style}: BackLinkProps) {
  return (
    <Link className={`${pageStyles.textLink} gap-2 text-accent hover:text-text focus-visible:text-text ${className}`} href={href} style={style}>
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}
