export type TimelineEntry = {
  id: string;
  category: 'Education' | 'Work' | 'Project' | 'Community';
  dateRange: string;
  title: string;
  role?: string;
  summary: string;
  href?: string;
  isCurrent?: boolean;
};

export const ABOUT_TIMELINE: readonly TimelineEntry[] = [
  {
    id: 'nus',
    category: 'Education',
    dateRange: 'Now',
    title: 'National University of Singapore',
    role: 'Computer Science and Mathematics',
    summary: 'Studying computation from both an applied and mathematical perspective.',
    isCurrent: true,
  },
  {
    id: 'sonicboom-solutions',
    category: 'Work',
    dateRange: '2025',
    title: 'Sonicboom Solutions',
    role: 'Software Engineering Intern',
    summary: 'Built monitoring software connected to real-time operations across 13 sites.',
  },
  {
    id: 'uniplans',
    category: 'Project',
    dateRange: '2025',
    title: 'Uniplans',
    role: 'Course-planning platform',
    summary: 'Built tools for planning modules, prerequisites, examinations, and timetables.',
  },
  {
    id: 'nus-greyhats',
    category: 'Community',
    dateRange: '2025-2026',
    title: 'NUS Greyhats',
    role: 'Publicity Director',
    summary: 'Worked on visual communication and publicity for cybersecurity events.',
  },
  {
    id: 'medic-handbook',
    category: 'Project',
    dateRange: '2024',
    title: 'Medic Handbook',
    role: 'EMT, Singapore Civil Defence Force',
    summary: 'Built my first website as a field reference for emergency medical work.',
  },
];

// TODO: Replace these placeholders with Song's final public contact details.
export const ABOUT_CONTACT = {
  email: 'song@example.com',
  linkedIn: 'https://www.linkedin.com/',
  gitHub: 'https://github.com/',
  resume: '/resume.pdf',
} as const;
