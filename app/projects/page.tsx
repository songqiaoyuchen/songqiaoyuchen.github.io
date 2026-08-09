import type {Metadata} from 'next';
import {ProjectCard} from '@/components/home/drawer/projects/ProjectCard';
import {PROJECTS} from '@/data/projects';

export const metadata: Metadata = {
  description: 'Selected software projects built by SQYC.',
  title: 'Projects | SQYC',
};

export default function ProjectsPage() {
  return (
    <main className="relative min-h-svh overflow-x-clip bg-background pb-32 pt-18 text-text sm:pt-32">
      <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
        <header className="max-w-2xl">
          <h1 className="article-title m-0 text-4xl font-normal leading-[1.08] text-text sm:text-6xl lg:text-7xl">
            Projects
          </h1>
        </header>

        <section aria-labelledby="project-list-title" className="mt-12 sm:mt-16">
          <h2 className="sr-only" id="project-list-title">All projects</h2>
          <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
            {PROJECTS.map((project, index) => (
              <li key={project.id}>
                <ProjectCard index={index} project={project} />
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
