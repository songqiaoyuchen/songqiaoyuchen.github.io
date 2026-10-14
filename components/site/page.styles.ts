// Tailwind classes shared by the scrolling content pages (/projects/all, /blog/all, /blog/[slug]).
export const pageStyles = {
  main: 'relative min-h-svh overflow-x-clip bg-background pb-32 pt-18 text-text sm:pt-32',
  container: 'relative mx-auto px-6 sm:px-10',
  // Archive heading with its count: a small caps label like the nav and Art's All works title.
  archiveTitle: `m-0 flex items-baseline gap-2.5 whitespace-nowrap text-(length:--font-size-ui) font-normal
    leading-[1.2] uppercase tracking-label text-text`,
  archiveTotal: 'text-(length:--font-size-ui) tabular-nums tracking-[0.04em] text-accent',
  // Small uppercase text link (article back/forward links). Focus shows as the hover colour, not a ring.
  textLink: `inline-flex min-h-11 items-center font-mono text-label uppercase tracking-label
    transition-colors focus-visible:outline-none`,
} as const;
