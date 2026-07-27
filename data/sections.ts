export type SectionId = 'projects' | 'art' | 'blog' | 'about';

interface Section {
  id: SectionId;
  label: string;
  href: string;
  description: string;
}

export const SECTIONS = {
  projects: {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    description: 'Systems, tools, experiments, and interfaces.',
  },
  art: {
    id: 'art',
    label: 'Art',
    href: '/artworks',
    description: 'Paintings, drawings, and visual experiments.',
  },
  blog: {
    id: 'blog',
    label: 'Blog',
    href: '/blog',
    description: 'Notes on design, technology, and creative practice.',
  },
  about: {
    id: 'about',
    label: 'About',
    href: '/about',
    description: 'Background, interests, and ways to get in touch.',
  },
} as const satisfies Record<SectionId, Section>;

// Section on navbar
export const NAV_SECTIONS = [SECTIONS.projects, SECTIONS.art, SECTIONS.blog];
