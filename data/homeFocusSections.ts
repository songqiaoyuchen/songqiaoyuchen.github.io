import type { SectionId } from './homeSections';

export type HomeSection = SectionId | 'blog' | 'about';

export const HOME_FOCUS_SECTION_LABELS: Record<HomeSection, string> = {
  projects: 'Projects',
  art: 'Art',
  travel: 'Travel',
  blog: 'Blog',
  about: 'About',
};
