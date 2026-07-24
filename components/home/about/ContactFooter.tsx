import type {ReactNode} from 'react';
import {ABOUT_CONTACT} from '@/data/aboutTimeline';

const CONTACT_ICON_LINK = `group grid size-11 place-items-center rounded-xs border border-line
  bg-surface-soft text-muted no-underline transition-[border-color,background-color,color,transform]
  duration-interaction ease-out hover:-translate-y-0.5 hover:border-accent-dim
  hover:bg-surface-hover hover:text-accent focus-visible:outline-1
  focus-visible:outline-offset-4 focus-visible:outline-accent`;

interface ContactIconLinkProps {
  children: ReactNode;
  href: string;
  label: string;
  opensNewTab?: boolean;
}

function ContactIconLink({children, href, label, opensNewTab = false}: ContactIconLinkProps) {
  return (
    <a
      aria-label={label}
      className={CONTACT_ICON_LINK}
      href={href}
      rel={opensNewTab ? 'noreferrer' : undefined}
      target={opensNewTab ? '_blank' : undefined}
      title={label}
    >
      {children}
    </a>
  );
}

export function ContactFooter() {
  return (
    <footer aria-labelledby="connect-title" className="mt-16 border-t border-line pt-8 pb-20
      sm:mt-20 sm:pb-24">
      <h3
        className="m-0 font-serif text-3xl leading-none font-normal tracking-[0.04em]
          text-accent italic uppercase"
        id="connect-title"
      >
        Connect
      </h3>
      <p
        className="mt-4 mb-0 max-w-prose font-mono text-summary leading-summary
          tracking-[0.025em] text-muted-soft"
      >
        Open for opportunities, collaborations, art jam or a chill ride on the bike.
      </p>
      <nav aria-label="Contact links" className="mt-5">
        <ul className="m-0 flex list-none items-center gap-2.5 p-0">
          <li>
            <ContactIconLink href={`mailto:${ABOUT_CONTACT.email}`} label="Email Song">
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <path d="M3.5 5.5h17v13h-17z" stroke="currentColor" strokeWidth="1.5" />
                <path d="m4 6 8 6.5L20 6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </ContactIconLink>
          </li>
          <li>
            <ContactIconLink
              href={ABOUT_CONTACT.linkedIn}
              label="LinkedIn profile"
              opensNewTab
            >
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <path d="M6 9v9M6 6v.01M10 18v-5a4 4 0 0 1 8 0v5M10 9v9"
                  stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </ContactIconLink>
          </li>
          <li>
            <ContactIconLink
              href={ABOUT_CONTACT.gitHub}
              label="GitHub profile"
              opensNewTab
            >
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <path d="M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.7-1.4 5.7-6.2
                  0-1.4-.5-2.5-1.3-3.4.1-.3.6-1.7-.1-3.4 0 0-1.1-.4-3.6 1.3
                  a12.2 12.2 0 0 0-6.4 0C6.3 2.1 5.2 2.5 5.2 2.5c-.7 1.7-.2 3.1-.1 3.4
                  -.8.9-1.3 2-1.3 3.4 0 4.8 2.9 5.9 5.7 6.2-.5.5-.6 1-.6 2V21"
                  stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                  strokeWidth="1.5" />
              </svg>
            </ContactIconLink>
          </li>
          <li>
            <ContactIconLink
              href={ABOUT_CONTACT.resume}
              label="View résumé"
              opensNewTab
            >
              <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
                <path d="M6 3.5h8l4 4v13H6z" stroke="currentColor" strokeLinejoin="round"
                  strokeWidth="1.5" />
                <path d="M14 3.5v4h4M9 12h6M9 15.5h6" stroke="currentColor"
                  strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </ContactIconLink>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
