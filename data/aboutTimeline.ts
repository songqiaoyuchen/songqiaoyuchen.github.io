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
    dateRange: '2024-2026',
    title: 'NUS Greyhats',
    role: 'Publicity Director/Member',
    summary: 'Worked on visual communication and publicity for cybersecurity events.',
  },
  {
    id: 'medic-handbook',
    category: 'Project',
    dateRange: '2024',
    title: 'Medic Handbook',
    role: 'Eemergency Medical Services, Singapore Civil Defence Force',
    summary: `A field reference guide for emergency medical protocols. 
              It is my first website, built with vanilla JS, HTML, and CSS.`,
  },
];

export const ABOUT_CONTACT = {
  email: 'songqiaoyuchen@gmail.com',
  linkedIn: 'https://www.linkedin.com/',
  gitHub: 'https://github.com/',
  resume: '/resume.pdf',
} as const;
