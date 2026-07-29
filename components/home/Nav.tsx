'use client';

import { NAV_SECTIONS } from '@/data/sections';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {preloadTerrainManifest} from '@/lib/terrain/manifest';

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Site navigation"
      className="top-nav-glass fixed inset-x-0 top-0 z-50 flex flex-nowrap items-center
        justify-between gap-3 px-5 py-2.5 text-xs sm:px-10 sm:py-5"
    >
      <Link
        aria-current={pathname === '/' ? 'page' : undefined}
        className={`flex min-h-11 shrink-0 items-center font-mono text-sm uppercase tracking-brand
          transition-colors hover:text-accent focus-visible:outline-1
          focus-visible:outline-offset-4 focus-visible:outline-accent
          ${pathname === '/' ? 'text-accent' : 'text-muted'}`}
        href="/"
        onFocus={pathname === '/' ? undefined : preloadTerrainManifest}
        onPointerEnter={pathname === '/' ? undefined : preloadTerrainManifest}
      >
        SQYC
      </Link>

      <ul
        className="m-0 flex min-w-0 list-none items-center justify-end gap-1 p-0 sm:gap-8"
      >
        {NAV_SECTIONS.map((section) => (
          <li key={section.id}>
            <Link
              aria-current={pathname.startsWith(section.href) ? 'page' : undefined}
              className={`flex min-h-11 items-center px-1.5 font-mono text-micro uppercase
                tracking-label sm:px-0 sm:text-xs
                ${pathname.startsWith(section.href) ? 'text-accent' : 'text-muted'}
                transition-colors hover:text-accent
                focus-visible:outline-1 focus-visible:outline-offset-4
                focus-visible:outline-accent`}
              href={section.href}
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
