// "All works →" / "← Selected works": switches gallery views, snapshotting poses for the gallery transition.
import Link from 'next/link';

type ScopeLinkProps = {
  /** The view currently shown; the link leads to the other one. */
  all: boolean;
  href: string;
  onNavigate: () => void;
};

export function ScopeLink({all, href, onNavigate}: ScopeLinkProps) {
  return (
    <Link className="art-text-link art-scope-link" href={href}
      onNavigate={onNavigate} scroll={false}>
      {all
        ? <><span aria-hidden="true">←</span> Selected works</>
        : <>All works <span aria-hidden="true">→</span></>}
    </Link>
  );
}
