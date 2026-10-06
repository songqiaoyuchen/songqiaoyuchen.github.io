// Fixed site navigation on every page: the SQYC wordmark (the only way Home) and section links.
'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {SECTION_LABELS} from '@/data/sections';
import {preloadTerrainManifest} from '@/lib/terrain/manifest';
import {navStyles} from './Nav.styles';

const NAV_ITEMS = [
  {href: '/projects', label: SECTION_LABELS.projects},
  {href: '/artworks', label: SECTION_LABELS.art},
  {href: '/blog', label: SECTION_LABELS.blog},
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Site navigation" className={navStyles.bar}>
      <Link
        aria-current={pathname === '/' ? 'page' : undefined}
        className={`${navStyles.brand} ${pathname === '/' ? navStyles.current : navStyles.idle}`}
        href="/"
        // Start fetching the terrain manifest as soon as Home looks likely.
        onFocus={pathname === '/' ? undefined : preloadTerrainManifest}
        onPointerEnter={pathname === '/' ? undefined : preloadTerrainManifest}
      >
        SQYC
      </Link>

      <ul className={navStyles.list}>
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
              className={`${navStyles.item} ${pathname.startsWith(item.href) ? navStyles.current : navStyles.idle}`}
              href={item.href}
              onClick={(event) => {
                // Already on Art: keep the current view instead of resetting it.
                if (item.href === '/artworks' && pathname.startsWith('/artworks')
                  && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) event.preventDefault();
              }}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
