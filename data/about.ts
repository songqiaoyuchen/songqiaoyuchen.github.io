// About drawer content: introduction, experience timeline and contact links.
export const ABOUT_INTRO = {
  name: 'Song Qiaoyuchen',
  studies: 'Computer Science + Mathematics · National University of Singapore',
  bio: 'I build software across systems, interfaces, and interactive graphics. '
    + 'Outside engineering, I work with visual art and explore places through cycling.',
  connect: 'Open for opportunities, collaborations, art jam or a chill ride on the bike.',
} as const;

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
    dateRange: '2024 - Now',
    title: 'National University of Singapore',
    role: 'Computer Science and Mathematics',
    summary: 'GPA: 4.95/5.00 (Mathematics), 4.85/5.00 (Computer Science).',
    isCurrent: true,
  },
  {
    id: 'uniplans',
    category: 'Project',
    dateRange: '2026',
    title: 'Uniplans',
    role: 'Course-planning platform',
    summary: `A web application for NUS students to optimise their university course plans and visualize their academic journey. 
              Built with React, TypeScript, Neo4j and Supabase.`,
  },
  {
    id: 'sonicboom-solutions',
    category: 'Work',
    dateRange: '2025',
    title: 'Sonicboom Solutions',
    role: 'Software Engineering Intern',
    summary: 'Rebuilt monitoring software connected to real-time car-parking operations across 13 sites.',
  },
  {
    id: 'nus-greyhats',
    category: 'Community',
    dateRange: '2024-NOW',
    title: 'NUS Greyhats',
    role: 'Publicity Director/Member',
    summary: 'Worked on visual communication and publicity for cybersecurity events.',
  },
  {
    id: 'medic-handbook',
    category: 'Project',
    dateRange: '2024',
    title: 'Medic Handbook',
    role: 'EMT, Singapore Civil Defence Force',
    summary: `A reference guide for medics in Yishun Fire Station. 
              It is my first website, built with vanilla JS, HTML, and CSS.`,
  },
];

export const ABOUT_CONTACT = {
  email: 'songqiaoyuchen@gmail.com',
  linkedIn: 'https://sg.linkedin.com/in/song-qiaoyuchen',
  gitHub: 'https://github.com/songqiaoyuchen',
  resume: '/resume.pdf',
} as const;
