export type SectionId = 'projects' | 'art' | 'blog' | 'about';

interface Section {
  id: SectionId;
  label: string;
  href: string;
  preview: {
    description: string;
    items: readonly string[];
  };
}

export const SECTIONS = {
  projects: {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    preview: {
      description: 'Systems, tools, experiments, and interfaces.',
      items: ['MarketLab', 'Uniplans', 'Hawkeye Console'],
    },
  },
  art: {
    id: 'art',
    label: 'Art',
    href: '/art',
    preview: {
      description: 'Paintings, drawings, and visual experiments.',
      items: ['Oil Studies', 'Digital Work', 'Sketchbooks'],
    },
  },
  blog: {
    id: 'blog',
    label: 'Blog',
    href: '/blog',
    preview: {
      description: 'Notes on design, technology, and creative practice.',
      items: ['Field Notes', 'Build Logs', 'Reading Notes'],
    },
  },
  about: {
    id: 'about',
    label: 'About',
    href: '/about',
    preview: {
      description: 'Background, interests, and ways to get in touch.',
      items: ['Profile', 'Now', 'Contact'],
    },
  },
} as const satisfies Record<SectionId, Section>;

export const NAV_SECTIONS = [SECTIONS.projects, SECTIONS.art, SECTIONS.blog, SECTIONS.about];
