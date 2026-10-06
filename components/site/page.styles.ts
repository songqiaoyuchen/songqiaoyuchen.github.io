// Tailwind classes shared by the scrolling content pages (/projects, /blog, /blog/[slug]).
export const pageStyles = {
  main: 'relative min-h-svh overflow-x-clip bg-background pb-32 pt-18 text-text sm:pt-32',
  container: 'relative mx-auto px-6 sm:px-10',
  title: 'article-title m-0 text-4xl font-normal leading-[1.08] text-text sm:text-6xl lg:text-7xl',
  // Small uppercase text link (article back/forward links).
  textLink: `inline-flex min-h-11 items-center font-mono text-label uppercase tracking-label
    transition-colors focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent`,
} as const;
