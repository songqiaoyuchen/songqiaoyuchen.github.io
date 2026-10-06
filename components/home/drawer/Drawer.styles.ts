// Tailwind classes shared by the drawer frame (Drawer.tsx) and its About/Blog/Projects panels.
export const drawerStyles = {
  aside: `fixed inset-y-0 left-0 z-40 w-full md:w-drawer
    transition-[opacity,visibility] duration-100 motion-reduce:duration-0`,
  open: 'visible pointer-events-auto opacity-100',
  closed: 'invisible pointer-events-none opacity-0',
  // Gradient backdrop on desktop (Drawer.css), solid panel on mobile.
  backdrop: `preview-backdrop pointer-events-none absolute inset-0
    max-md:border-r-0 max-md:bg-panel/94 max-md:mask-none`,
  body: 'relative z-10 h-full',
  close: `absolute right-6 top-20 z-50 grid size-11 place-items-center border-0 bg-transparent
    p-0 font-mono text-xl font-light leading-none text-dim transition-colors
    duration-interaction ease-out hover:text-text focus-visible:outline-1
    focus-visible:outline-offset-4 focus-visible:outline-accent md:right-0 md:top-24`,
} as const;

export const panelStyles = {
  // The scrolling column inside every panel.
  scroll: `no-scrollbar flex h-full w-full max-w-none touch-pan-y
    flex-col overflow-x-hidden overflow-y-auto overscroll-contain px-6 pb-10 pt-24
    md:max-w-drawer md:px-10 md:pt-28`,
  content: 'animate-drawer-content motion-reduce:animate-none',
  title: `mb-5 font-serif text-display font-normal italic uppercase leading-none
    text-text md:text-5xl`,
  intro: 'm-0 max-w-copy font-mono text-copy leading-copy text-muted',
  focusRing: `rounded-xs focus-visible:outline-1 focus-visible:outline-offset-4
    focus-visible:outline-accent`,
  // "View all …" link at the end of the Blog and Projects panels.
  viewAll: `mt-7 inline-flex min-h-11 items-center font-mono text-label uppercase
    tracking-label text-accent transition-colors duration-interaction hover:text-text`,
  // Small serif section heading inside a panel (Experience, Connect).
  sectionTitle: `m-0 font-serif text-3xl leading-none font-normal
    tracking-[0.04em] text-accent italic uppercase`,
} as const;
