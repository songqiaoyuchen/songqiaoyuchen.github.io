// Fixed site navigation on every page: the SQYC wordmark (the only way Home) and section links.
'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {SECTION_LABELS} from '@/data/sections';
import {preloadTerrainManifest} from '@/lib/terrain/manifest';
import {navStyles} from './Nav.styles';

/** Dispatched on window when SQYC is clicked on Home: SceneShell closes any open section. */
export const HOME_OVERVIEW_EVENT = 'sqyc:home-overview';
/**
 * Dispatched on window (cancelable, detail {href}) before a nav link navigates: SceneShell cancels it to fade a
 * routed section's content out and start the camera before it pushes the route itself.
 */
export const SECTION_NAVIGATE_EVENT = 'sqyc:section-navigate';

/** Let the shell take over an ordinary (unmodified) click on a section link. */
function requestSectionNavigation(event: React.MouseEvent, href: string) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const handled = !window.dispatchEvent(new CustomEvent(SECTION_NAVIGATE_EVENT, {cancelable: true, detail: {href}}));
  if (handled) event.preventDefault();
}

const NAV_ITEMS = [
  {href: '/projects', label: SECTION_LABELS.projects},
  {href: '/artworks', label: SECTION_LABELS.art},
  {href: '/blog', label: SECTION_LABELS.blog},
  {href: '/travel', label: SECTION_LABELS.travel},
  {href: '/about', label: SECTION_LABELS.about},
] as const;

/** Sections whose deeper views stay put when their nav item is clicked again. */
const KEEPS_VIEW = ['/artworks', '/travel'];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Site navigation" className={navStyles.bar}>
      <Link
        aria-current={pathname === '/' ? 'page' : undefined}
        className={`${navStyles.brand} ${pathname === '/' ? navStyles.current : navStyles.idle}`}
        href="/"
        // Already Home: the link cannot navigate, so ask the scene to return to the landscape overview.
        onClick={pathname === '/'
          ? () => window.dispatchEvent(new Event(HOME_OVERVIEW_EVENT))
          : (event) => requestSectionNavigation(event, '/')}
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
                // Already on Art or Travel: keep the current view instead of resetting it.
                if (KEEPS_VIEW.includes(item.href) && pathname.startsWith(item.href)
                  && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) event.preventDefault();
                else requestSectionNavigation(event, item.href);
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
