// 24px line icons for the About contact links (email, LinkedIn, GitHub, résumé).
const ICON = {'aria-hidden': true, className: 'size-5', fill: 'none', viewBox: '0 0 24 24'} as const;

export function EmailIcon() {
  return (
    <svg {...ICON}>
      <path d="M3.5 5.5h17v13h-17z" stroke="currentColor" strokeWidth="1.5" />
      <path d="m4 6 8 6.5L20 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg {...ICON}>
      <path d="M6 9v9M6 6v.01M10 18v-5a4 4 0 0 1 8 0v5M10 9v9"
        stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

export function GitHubIcon() {
  return (
    <svg {...ICON}>
      <path d="M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.7-1.4 5.7-6.2
        0-1.4-.5-2.5-1.3-3.4.1-.3.6-1.7-.1-3.4 0 0-1.1-.4-3.6 1.3
        a12.2 12.2 0 0 0-6.4 0C6.3 2.1 5.2 2.5 5.2 2.5c-.7 1.7-.2 3.1-.1 3.4
        -.8.9-1.3 2-1.3 3.4 0 4.8 2.9 5.9 5.7 6.2-.5.5-.6 1-.6 2V21"
        stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
        strokeWidth="1.5" />
    </svg>
  );
}

export function ResumeIcon() {
  return (
    <svg {...ICON}>
      <path d="M6 3.5h8l4 4v13H6z" stroke="currentColor" strokeLinejoin="round"
        strokeWidth="1.5" />
      <path d="M14 3.5v4h4M9 12h6M9 15.5h6" stroke="currentColor"
        strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
