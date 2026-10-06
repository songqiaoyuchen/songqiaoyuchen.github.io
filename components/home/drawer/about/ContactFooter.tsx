// "Connect" footer of the About panel: a short invitation and icon links (email, LinkedIn, GitHub, résumé).
import type {ReactNode} from 'react';
import {ABOUT_CONTACT, ABOUT_INTRO} from '@/data/about';
import {panelStyles} from '../Drawer.styles';
import {EmailIcon, GitHubIcon, LinkedInIcon, ResumeIcon} from './ContactIcons';

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
      md:mt-20 md:pb-24">
      <h3 className={panelStyles.sectionTitle} id="connect-title">
        Connect
      </h3>
      <p
        className="mt-4 mb-0 max-w-prose font-mono text-summary leading-summary
          tracking-[0.025em] text-muted-soft"
      >
        {ABOUT_INTRO.connect}
      </p>
      <nav aria-label="Contact links" className="mt-5">
        <ul className="m-0 flex list-none items-center gap-2.5 p-0">
          <li>
            <ContactIconLink href={`mailto:${ABOUT_CONTACT.email}`} label="Email Song">
              <EmailIcon />
            </ContactIconLink>
          </li>
          <li>
            <ContactIconLink href={ABOUT_CONTACT.linkedIn} label="LinkedIn profile" opensNewTab>
              <LinkedInIcon />
            </ContactIconLink>
          </li>
          <li>
            <ContactIconLink href={ABOUT_CONTACT.gitHub} label="GitHub profile" opensNewTab>
              <GitHubIcon />
            </ContactIconLink>
          </li>
          <li>
            <ContactIconLink href={ABOUT_CONTACT.resume} label="View résumé" opensNewTab>
              <ResumeIcon />
            </ContactIconLink>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
