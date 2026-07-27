'use client';

import { NAV_SECTIONS } from '@/data/sections';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      aria-label="Site navigation"
      className="top-nav-glass fixed text-xs inset-x-0 top-0 z-50 flex flex-wrap items-center
        justify-between gap-y-1 px-6 py-5 sm:flex-nowrap sm:px-10"
    >
      <Link
        className={`flex items-center font-mono text-base uppercase tracking-brand
          transition-colors hover:text-accent focus-visible:outline-1
          focus-visible:outline-offset-4 focus-visible:outline-accent
          ${pathname === '/' ? 'text-accent' : 'text-muted'}`}
        href="/"
      >
        SQYC
      </Link>

      <ul
        className="m-0 flex w-full list-none justify-between gap-0 p-0 sm:w-auto sm:gap-8"
      >
        {NAV_SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              aria-pressed={pathname.startsWith(`/${section.href}`)}
              className="min-w-11 border-0 bg-transparent px-0 py-1 font-mono text-sm
                uppercase tracking-label text-muted transition-colors hover:text-accent
                focus-visible:outline-1 focus-visible:outline-offset-4
                focus-visible:outline-accent"
              onClick={() => router.push(section.href)}
              type="button"
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
