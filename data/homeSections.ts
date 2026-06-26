export type SectionId = 'projects' | 'art' | 'travel';

export type HomeSection = {
  id: SectionId;
  label: string;
  preview: {
    description: string;
    items: string[];
  };
  href: string;
};

export const HOME_SECTIONS: HomeSection[] = [
  {
    id: 'projects',
    label: 'Projects',
    preview: {
      description: 'Systems, tools, experiments, and interfaces.',
      items: ['01 MarketLab', '02 Uniplans', '03 Hawkeye Console'],
    },
    href: '/projects',
  },
  {
    id: 'art',
    label: 'Art',
    preview: {
      description: 'Paintings, drawings, and visual experiments.',
      items: ['01 Oil Studies', '02 Digital Work', '03 Sketchbooks'],
    },
    href: '/art',
  },
  {
    id: 'travel',
    label: 'Travel',
    preview: {
      description: 'Places visited, routes mapped, observations gathered.',
      items: ['01 East Asia', '02 Europe', '03 Southeast Asia'],
    },
    href: '/travel',
  },
];
