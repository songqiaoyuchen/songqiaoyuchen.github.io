// Projects drawer panel: featured project cards and a link to /projects/all.
'use client';

import Link from 'next/link';
import {ProjectCard} from '@/components/projects/ProjectCard';
import {FEATURED_PROJECTS, PROJECTS_INTRO} from '@/data/projects';
import {panelStyles} from '../Drawer.styles';
import {usePanelScrollEdges} from '../usePanelScrollEdges';

interface ProjectsPanelProps {
  isOpen: boolean;
}

export function ProjectsPanel({isOpen}: ProjectsPanelProps) {
  const {shellRef, scrollRef, updateScrollState} = usePanelScrollEdges(isOpen, true);

  return (
    <div
      className="group/projects relative h-full min-h-0"
      data-at-end="false"
      data-at-start="true"
      ref={shellRef}
    >
      <div
        className={panelStyles.scroll}
        onScroll={updateScrollState}
        ref={scrollRef}
      >
        <div className={panelStyles.content}>
          <header className="mb-7">
            <h2 className={panelStyles.title}>
              Projects
            </h2>
            <p className={panelStyles.intro}>
              {PROJECTS_INTRO}
            </p>
          </header>

          <div aria-label="Featured projects" className="space-y-3">
            {FEATURED_PROJECTS.map((project, index) => (
              <ProjectCard index={index} key={project.id} project={project} />
            ))}
          </div>

          <Link className={`${panelStyles.viewAll} ${panelStyles.focusRing}`} href="/projects/all">
            View all projects <span aria-hidden="true" className="ml-2">&rarr;</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
