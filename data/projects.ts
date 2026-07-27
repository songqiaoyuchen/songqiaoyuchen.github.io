import type {IconName} from 'tech-stack-icons';

interface ProjectTechnology {
  icon: IconName;
  label: string;
}

interface Project {
  href: string;
  id: string;
  image: string;
  imageAlt: string;
  subtitle: string;
  technologies: ProjectTechnology[];
  title: string;
}

export const FEATURED_PROJECTS = [
  {
    href: '/projects/this-site',
    id: 'this-site',
    image: '/images/projects/this-site.webp',
    imageAlt: "This website's interface",
    subtitle: 'My personal website with some visual design explorations.',
    technologies: [
      {icon: 'react', label: 'React'},
      {icon: 'threejs', label: 'Three.js'},
      {icon: 'tailwindcss', label: 'Tailwind CSS'},
      {icon: 'typescript', label: 'TypeScript'},
    ],
    title: 'This site',
  },
  {
    href: '/projects/uniplans',
    id: 'uniplans',
    image: '/images/projects/uniplans.webp',
    imageAlt: 'Uniplans interface with course scheduling and visualization',
    subtitle: 'A course-planning platform for NUS students to optimise their academic journey.',
    technologies: [
      {icon: 'react', label: 'React'},
      {icon: 'redux', label: 'Redux'},
      {icon: 'neo4j', label: 'Neo4j'},
      {icon: 'supabase', label: 'Supabase'},
      {icon: 'typescript', label: 'TypeScript'},
    ],
    title: 'Uniplans',
  },
  {
    href: '/projects/Soforum',
    id: 'soforum',
    image: '/images/projects/soforum.webp',
    imageAlt: 'Soforum interface with discussion threads and user profiles',
    subtitle: 'A web forum that supports user discussions, thread management, and secure authentication.',
    technologies: [
      {icon: 'react', label: 'React'},
      {icon: 'materialui', label: 'Material UI'},
      {icon: 'postgresql', label: 'PostgreSQL'},
      {icon: 'go', label: 'Golang'},
    ],
    title: 'Soforum',
  },
] as const satisfies readonly Project[];
