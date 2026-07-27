import Link from 'next/link';
import type {ReactNode} from 'react';
import type {SectionId} from '@/data/sections';

interface DrawerPreviewsProps {
  sectionId: SectionId;
}

interface PreviewLinkProps {
  children: ReactNode;
  href: string;
  icon?: ReactNode;
}

function PreviewLink({children, href, icon}: PreviewLinkProps) {
  return (
    <Link
      className="group flex min-h-11 items-center gap-3 border-b border-line px-1 py-3
        font-mono text-copy uppercase tracking-label text-muted transition-colors
        hover:border-line-hover hover:text-text focus-visible:outline-1
        focus-visible:outline-offset-4 focus-visible:outline-accent"
      href={href}
    >
      {icon && (
        <span className="grid size-8 shrink-0 place-items-center text-accent" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
      <span className="ml-auto text-dim transition-transform group-hover:translate-x-1" aria-hidden="true">
        &rarr;
      </span>
    </Link>
  );
}

function ProjectsPreviews() {
  return null;
}

function ArtPreviews() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {['Paintings', 'Drawings', 'Experiments', 'Archive'].map((label, index) => (
        <Link
          className="group grid aspect-square place-items-center border border-line bg-surface-soft
            font-mono text-label uppercase tracking-label text-muted transition-colors
            hover:border-accent-dim hover:bg-surface-hover hover:text-text
            focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
          href="/art"
          key={label}
        >
          <span className="mb-2 text-2xl text-accent" aria-hidden="true">
            {['○', '△', '□', '◇'][index]}
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );
}

function BlogPreviews() {
  return (
    <nav aria-label="Featured blog topics">
      <PreviewLink href="/blog">Design notes</PreviewLink>
      <PreviewLink href="/blog">Technology notes</PreviewLink>
      <PreviewLink href="/blog">Creative practice</PreviewLink>
    </nav>
  );
}

function AboutPreviews() {
  return null;
}

const PREVIEWS_BY_SECTION = {
  projects: ProjectsPreviews,
  art: ArtPreviews,
  blog: BlogPreviews,
  about: AboutPreviews,
} satisfies Record<SectionId, () => ReactNode>;

export function DrawerPreviews({sectionId}: DrawerPreviewsProps) {
  const SectionPreviews = PREVIEWS_BY_SECTION[sectionId];
  return <SectionPreviews />;
}
