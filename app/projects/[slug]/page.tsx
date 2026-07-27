import type {Metadata} from 'next';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import StackIcon from 'tech-stack-icons';
import {FEATURED_PROJECTS} from '@/data/projects';

interface ProjectPageProps {
  params: Promise<{slug: string}>;
}

function getProject(slug: string) {
  return FEATURED_PROJECTS.find((project) => project.id === slug);
}

export function generateStaticParams() {
  return FEATURED_PROJECTS.map((project) => ({slug: project.id}));
}

export async function generateMetadata({params}: ProjectPageProps): Promise<Metadata> {
  const {slug} = await params;
  const project = getProject(slug);

  if (!project) return {};

  return {
    description: project.subtitle,
    title: `${project.title} | Song`,
  };
}

export default async function ProjectPage({params}: ProjectPageProps) {
  const {slug} = await params;
  const project = getProject(slug);

  if (!project) notFound();

  return (
    <main className="relative min-h-svh bg-background pt-28 text-text sm:pt-32">
      <div className="px-6 pb-8 sm:px-10 sm:pb-10">
        <div className="mx-auto max-w-5xl">
          <header className="mt-12 max-w-3xl sm:mt-16">
            <p className="mb-4 font-mono text-micro tracking-label text-accent-soft uppercase">
              Selected project
            </p>
            <h1 className="m-0 font-serif text-5xl font-normal italic leading-none text-text
              sm:text-7xl">
              {project.title}
            </h1>
            <p className="mt-6 mb-0 max-w-copy font-mono text-intro-copy leading-intro-copy
              tracking-[0.035em] text-muted">
              {project.subtitle}
            </p>
          </header>

          <div className="relative mt-10 aspect-video overflow-hidden rounded-card border
            border-line bg-panel sm:mt-14">
            <Image
              alt={project.imageAlt}
              className="object-cover object-center"
              fill
              priority
              sizes="(max-width: 1024px) calc(100vw - 48px), 960px"
              src={project.image}
            />
          </div>

          <section aria-labelledby="project-stack" className="mt-10 border-t border-line pt-6">
            <h2 className="m-0 font-mono text-label tracking-label text-muted uppercase"
              id="project-stack">
              Technology stack
            </h2>
            <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
              {project.technologies.map((technology) => (
                <li className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line
                  bg-surface-soft px-3 py-1 font-mono text-copy tracking-meta text-muted"
                  key={technology.label}>
                  <StackIcon className="size-4 rounded-[0.2rem]" name={technology.icon}
                    variant="dark" />
                  <span>{technology.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
