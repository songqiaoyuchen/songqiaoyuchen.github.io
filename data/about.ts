// About drawer content: introduction, experience timeline and contact links.
export const ABOUT_INTRO = {
  name: 'Song Qiaoyuchen',
  studies: 'Computer Science + Mathematics · National University of Singapore',
  bio: 'I build software across systems, interfaces, and interactive graphics. '
    + 'Outside engineering, I work with visual art and explore places through cycling.',
  connect: 'Open for opportunities, collaborations, art jam or a chill ride on the bike.',
} as const;

/** Entry ids double as checkpoint keys in config/scene/aboutPath.ts. */
export type TimelineEntryId = 'medic' | 'nus' | 'greyhats' | 'sonicboom' | 'uniplans';

export type TimelineEntry = {
  id: TimelineEntryId;
  category: 'Education' | 'Work' | 'Project' | 'Community';
  /** Start month as YYYY-MM; entries are listed by it, oldest first. */
  start: string;
  title: string;
  role?: string;
  summary: string;
  href?: string;
  isCurrent?: boolean;
};

export const ABOUT_TIMELINE: readonly TimelineEntry[] = [
  {
    id: 'medic',
    category: 'Project',
    start: '2024-04',
    title: 'Medic Handbook',
    role: 'EMT, Singapore Civil Defence Force',
    summary: 'A reference guide for medics in Yishun Fire Station. '
      + 'It is my first website, built with vanilla JS, HTML, and CSS.',
  },
  {
    id: 'nus',
    category: 'Education',
    start: '2024-08',
    title: 'National University of Singapore',
    role: 'Computer Science and Mathematics',
    summary: 'GPA: 4.95/5.00 (Mathematics), 4.85/5.00 (Computer Science).',
    isCurrent: true,
  },
  {
    id: 'greyhats',
    category: 'Community',
    start: '2024-09',
    title: 'NUS Greyhats',
    role: 'Publicity Director/Member',
    summary: 'Worked on visual communication and publicity for cybersecurity events.',
  },
  {
    id: 'sonicboom',
    category: 'Work',
    start: '2025-05',
    title: 'Sonicboom Solutions',
    role: 'Software Engineering Intern',
    summary: 'Rebuilt monitoring software connected to real-time car-parking operations across 13 sites.',
  },
  {
    id: 'uniplans',
    category: 'Project',
    start: '2025-12',
    title: 'Uniplans',
    role: 'Course-planning platform',
    summary: 'A web application for NUS students to optimise their university course plans '
      + 'and visualize their academic journey. Built with React, TypeScript, Neo4j and Supabase.',
  },
];

const START_FORMAT = new Intl.DateTimeFormat('en', {month: 'short', year: 'numeric', timeZone: 'UTC'});

/** "2024-04" -> "Apr 2024", identical on server and client. */
export function formatEntryStart(start: string) {
  const [year, month] = start.split('-').map(Number);
  return START_FORMAT.format(Date.UTC(year, month - 1));
}

export const ABOUT_CONTACT = {
  email: 'songqiaoyuchen@gmail.com',
  linkedIn: 'https://sg.linkedin.com/in/song-qiaoyuchen',
  gitHub: 'https://github.com/songqiaoyuchen',
  resume: '/resume.pdf',
} as const;
