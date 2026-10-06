// Homepage preview drawer: slides in the About, Blog or Projects panel beside the scene; Escape closes it.
'use client';

import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type TransitionEvent,
} from 'react';
import {SECTION_LABELS, type SectionId} from '@/data/sections';
import type {ArticleSummary} from '@/lib/content/types';
import {drawerStyles} from './Drawer.styles';

const AboutPanel = lazy(() => import('./about/AboutPanel').then(
  ({AboutPanel: Panel}) => ({default: Panel}),
));
const BlogPanel = lazy(() => import('./blog/BlogPanel').then(
  ({BlogPanel: Panel}) => ({default: Panel}),
));
const ProjectsPanel = lazy(() => import('./projects/ProjectsPanel').then(
  ({ProjectsPanel: Panel}) => ({default: Panel}),
));

type PreviewSectionId = Exclude<SectionId, 'art'>;

interface DrawerProps {
  activeId: PreviewSectionId | null;
  articles: readonly ArticleSummary[];
  onClose: () => void;
}

export function Drawer({activeId, articles, onClose}: DrawerProps) {
  // The last panel stays rendered while the drawer fades out.
  const [displayedId, setDisplayedId] = useState<PreviewSectionId | null>(activeId);

  useEffect(() => {
    if (activeId === null) return;

    const frame = window.requestAnimationFrame(() => setDisplayedId(activeId));
    return () => window.cancelAnimationFrame(frame);
  }, [activeId]);

  useEffect(() => {
    if (activeId === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, onClose]);

  function handleTransitionEnd(event: TransitionEvent<HTMLElement>) {
    if (event.target === event.currentTarget && activeId === null) {
      setDisplayedId(null);
    }
  }

  if (displayedId === null) return null;

  const sectionLabel = SECTION_LABELS[displayedId];
  const isAbout = displayedId === 'about';
  const isBlog = displayedId === 'blog';

  return (
    <aside
      aria-hidden={activeId === null}
      aria-label={`${sectionLabel} preview`}
      className={`${drawerStyles.aside} ${activeId !== null ? drawerStyles.open : drawerStyles.closed}`}
      id="section-preview"
      inert={activeId === null}
      onTransitionEnd={handleTransitionEnd}
    >
      <div aria-hidden="true" className={drawerStyles.backdrop} />

      <div className={drawerStyles.body}>
        <Suspense fallback={null}>
          {isAbout ? (
            <AboutPanel isOpen={activeId === 'about'} />
          ) : isBlog ? (
            <BlogPanel articles={articles} isOpen={activeId === 'blog'} />
          ) : (
            <ProjectsPanel isOpen={activeId === 'projects'} />
          )}
        </Suspense>
      </div>

      <button
        aria-label={`Close ${sectionLabel.toLowerCase()} preview`}
        className={drawerStyles.close}
        onClick={onClose}
        tabIndex={activeId !== null ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </aside>
  );
}
