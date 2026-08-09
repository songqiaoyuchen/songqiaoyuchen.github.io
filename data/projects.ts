import type {StaticImageData} from 'next/image';
import thisSiteImage from '@/public/images/projects/this-site.webp';
import uniplansImage from '@/public/images/projects/uniplans.webp';
import soforumImage from '@/public/images/projects/soforum.webp';
import medicHandbookImage from '@/public/images/projects/medic-handbook.webp';

type TechnologyIconName =
  | 'go'
  | 'mui'
  | 'neo4j'
  | 'postgresql'
  | 'react'
  | 'redux'
  | 'supabase'
  | 'tailwindcss'
  | 'threejs'
  | 'typescript'
  | 'html'
  | 'css'
  | 'javascript';

interface ProjectTechnology {
  icon: TechnologyIconName;
  label: string;
}

export interface Project {
  featured: boolean;
  href: string;
  id: string;
  image?: StaticImageData;
  imageAlt?: string;
  subtitle: string;
  technologies: readonly ProjectTechnology[];
  title: string;
}

export const PROJECTS = [
  {
    featured: true,
    href: 'https://github.com/songqiaoyuchen/sqyc',
    id: 'this-site',
    image: thisSiteImage,
    imageAlt: "This website's interface",
    subtitle: 'My personal website with some visual design and UI/UX explorations, still in progress.',
    technologies: [
      {icon: 'react', label: 'React'},
      {icon: 'threejs', label: 'Three.js'},
      {icon: 'tailwindcss', label: 'Tailwind CSS'},
      {icon: 'typescript', label: 'TypeScript'},
    ],
    title: 'This site',
  },
  {
    featured: true,
    href: 'https://github.com/songqiaoyuchen/uniplans',
    id: 'uniplans',
    image: uniplansImage,
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
    featured: false,
    href: 'https://github.com/songqiaoyuchen/soforum',
    id: 'soforum',
    image: soforumImage,
    imageAlt: 'Soforum interface with discussion threads and user profiles',
    subtitle: 'A web forum that supports user discussions, thread management, and secure authentication.',
    technologies: [
      {icon: 'react', label: 'React'},
      {icon: 'mui', label: 'Material UI'},
      {icon: 'postgresql', label: 'PostgreSQL'},
      {icon: 'go', label: 'Go'},
    ],
    title: 'Soforum',
  },
  {
    featured: false,
    href: 'https://github.com/songqiaoyuchen/medic-handbook',
    id: 'medic-handbook',
    image: medicHandbookImage,
    imageAlt: 'Medic Handbook interface with training materials and resources',
    subtitle: 'My first ever coding project. A web doc that provides training notes for emergency medical technicians at Yishun Fire Station.',
    technologies: [
      {icon: 'html', label: 'HTML'},
      {icon: 'css', label: 'CSS'},
      {icon: 'javascript', label: 'JavaScript'},
    ],
    title: 'Medic Handbook',
  }
] as const satisfies readonly Project[];

export const FEATURED_PROJECTS = PROJECTS.filter((project) => project.featured);
