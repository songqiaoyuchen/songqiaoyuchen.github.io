import Image from 'next/image';
import Link from 'next/link';
import type {ReactNode} from 'react';
import type {SectionId} from '@/data/sections';
import PixelCard from './PixelCard';

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
  return (
    <>
    <PixelCard speed={20} className="w-full" variant="yellow">
      <Image
        alt="test"
        className="h-56 object-cover"
        height={400}
        src="/images/test.jpg"
        width={200}
      />
    </PixelCard>
    </>
  );
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
  return (
    <div className="space-y-1">
      <PreviewLink
        href="/about"
        icon={
          <svg fill="none" viewBox="0 0 24 24" className="size-5" stroke="currentColor">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.75 20c.45-4 2.55-6 6.25-6s5.8 2 6.25 6" />
          </svg>
        }
      >
        Background
      </PreviewLink>
      <PreviewLink
        href="/about"
        icon={
          <svg fill="none" viewBox="0 0 24 24" className="size-5" stroke="currentColor">
            <path d="m12 3 2.2 5.2L20 10l-4.4 3.8.15 5.7L12 16.2 8.25 19.5l.15-5.7L4 10l5.8-1.8L12 3Z" />
          </svg>
        }
      >
        Interests
      </PreviewLink>
      <PreviewLink
        href="/about"
        icon={
          <svg fill="none" viewBox="0 0 24 24" className="size-5" stroke="currentColor">
            <path d="M3.5 6.5h17v11h-17z" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        }
      >
        Contact
      </PreviewLink>
    </div>
  );
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
