// Tailwind classes for the fixed site nav (Nav.tsx); the frosted backdrop is the top-nav-glass utility (Nav.css).
export const navStyles = {
  bar: `top-nav-glass fixed inset-x-0 top-0 z-50 flex flex-nowrap items-center
    justify-between gap-3 px-page-gutter py-2.5 text-xs sm:py-5`,
  brand: `flex min-h-11 shrink-0 items-center font-mono text-sm uppercase tracking-brand
    transition-colors hover:text-accent focus-visible:outline-1
    focus-visible:outline-offset-4 focus-visible:outline-accent`,
  list: 'm-0 flex min-w-0 list-none items-center justify-end gap-1 p-0 sm:gap-8',
  item: `flex min-h-11 items-center px-1.5 font-mono text-micro uppercase
    tracking-label sm:px-0 sm:text-xs
    transition-colors hover:text-accent
    focus-visible:outline-1 focus-visible:outline-offset-4
    focus-visible:outline-accent`,
  current: 'text-accent',
  idle: 'text-muted',
} as const;
