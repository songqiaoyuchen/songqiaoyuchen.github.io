// Site sections reachable from the homepage scene links, drawer and navigation.
export type SectionId = 'projects' | 'art' | 'blog' | 'about' | 'travel';

/** Visible section names, shared by the site nav and the drawer. */
export const SECTION_LABELS: Record<SectionId, string> = {
  about: 'About',
  art: 'Art',
  blog: 'Blog',
  projects: 'Projects',
  travel: 'Travel',
};
