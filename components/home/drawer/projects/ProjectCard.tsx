'use client';

import Image from 'next/image';
import {useState} from 'react';
import type {Project} from '@/data/projects';
import PixelCard from './PixelCard';

interface ProjectCardProps {
  index: number;
  project: Project;
}

export function ProjectCard({index, project}: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleBlur: React.FocusEventHandler<HTMLAnchorElement> = e => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsHovered(false);
  };

  const handleFocus: React.FocusEventHandler<HTMLAnchorElement> = e => {
    setIsHovered(e.currentTarget.matches(':focus-visible'));
  };

  const handlePointerEnter: React.PointerEventHandler<HTMLAnchorElement> = e => {
    if (e.pointerType === 'mouse') setIsHovered(true);
  };

  const handlePointerLeave: React.PointerEventHandler<HTMLAnchorElement> = e => {
    if (e.pointerType === 'mouse') setIsHovered(false);
  };

  return (
    <a
      aria-label={`View ${project.title} source code on GitHub`}
      className="group/card block rounded-card border border-line bg-surface-soft p-2 no-underline
        transition-[border-color,background-color] duration-interaction ease-out
        hover:bg-surface-hover focus-visible:outline-1
        focus-visible:outline-offset-4 focus-visible:outline-accent"
      onBlur={handleBlur}
      onFocus={handleFocus}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      href={project.href}
    >
      <article id={project.id}>
        <PixelCard
          active={isHovered}
          className="w-full rounded-[calc(var(--radius-card)-0.125rem)]"
          noFocus
          speed={20}
          variant="yellow"
        >
          <div className="relative h-[clamp(12rem,18vw,15rem)] w-full overflow-hidden bg-panel">
            {project.image ? (
              <Image
                alt={project.imageAlt ?? ''}
                className="object-cover object-center opacity-88 transition-opacity duration-500
                  ease-out group-hover/card:opacity-100 motion-reduce:transition-none"
                fill
                loading={index === 0 ? 'eager' : 'lazy'}
                sizes="(max-width: 639px) calc(100vw - 108px), 480px"
                src={project.image}
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-full items-center justify-center bg-surface-strong font-mono text-label
                  tracking-label text-dim uppercase"
              >
                {project.title}
              </div>
            )}
          </div>
        </PixelCard>

        <div className="px-2 pt-4 pb-2 md:px-3 md:pt-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="m-0 font-serif text-card font-normal leading-tight tracking-[0.02em]
              text-text">
              {project.title}
            </h3>
            <span
              aria-hidden="true"
              className="shrink-0 font-mono text-label tracking-label text-dim uppercase
                transition-[color,transform]
                duration-interaction group-hover/card:translate-x-1 group-hover/card:text-accent
                motion-reduce:transition-none motion-reduce:group-hover/card:translate-x-0"
            >
              GitHub ↗
            </span>
          </div>
          <p className="mt-1.5 mb-0 font-mono text-summary leading-summary tracking-[0.025em]
            text-muted-soft">
            {project.subtitle}
          </p>

          <ul aria-label={`${project.title} technology stack`} className="mt-3 flex list-none
            flex-wrap gap-1.5 p-0">
            {project.technologies.map((technology) => (
              <li
                className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-line
                  bg-surface-strong px-2 py-0.5 font-mono text-micro tracking-meta text-muted"
                key={technology.label}
              >
                <Image
                  alt=""
                  aria-hidden="true"
                  className="size-3 shrink-0 overflow-hidden rounded-[0.2rem]"
                  height={12}
                  src={`/icons/techstack/${technology.icon}.svg`}
                  width={12}
                />
                <span>{technology.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </a>
  );
}
