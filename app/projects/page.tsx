// Projects archive route (/projects): every project card in a responsive grid.
import type {Metadata} from 'next';
import {ProjectCard} from '@/components/projects/ProjectCard';
import {pageStyles} from '@/components/site/page.styles';
import {PROJECTS} from '@/data/projects';

export const metadata: Metadata = {
  description: 'Selected software projects built by SQYC.',
  title: 'Projects | SQYC',
};

export default function ProjectsPage() {
  return (
    <main className={pageStyles.main}>
      <div className={`${pageStyles.container} max-w-7xl`}>
        <header className="max-w-2xl">
          <h1 className={pageStyles.title}>
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
