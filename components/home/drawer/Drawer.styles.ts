// Tailwind classes shared by the drawer frame (Drawer.tsx) and its About/Blog/Projects panels.
export const drawerStyles = {
  // Drawer.tsx adds the side and desktop width: asideStart, or asideEnd for About.
  aside: `fixed inset-y-0 z-40 w-full
    transition-[opacity,visibility] duration-100 motion-reduce:duration-0`,
  asideStart: 'left-0 md:w-drawer',
  // About sits right of its terrain path, a little wider so its column can breathe; on phones it starts below the
  // path's window (the phone About pose, config/scene/camera.ts).
  asideEnd: 'right-0 max-md:top-[40svh] md:w-[clamp(24rem,48vw,44rem)]',
  open: 'visible pointer-events-auto opacity-100',
  closed: 'invisible pointer-events-none opacity-0',
  // Gradient backdrop on desktop (Drawer.css), solid panel on mobile.
  backdrop: 'pointer-events-none absolute inset-0',
  backdropStart: 'preview-backdrop max-md:border-r-0 max-md:mask-none max-md:bg-panel/94',
  // About: a solid panel whose fade reaches out past the drawer's left edge; on phones the path's window fades
  // into it from above.
  backdropEnd: 'md:about-backdrop max-md:about-phone-backdrop',
  body: 'relative z-10 h-full',
  close: `absolute right-6 top-20 z-50 grid size-11 place-items-center border-0 bg-transparent
    p-0 font-mono text-xl font-light leading-none text-dim transition-colors
    duration-interaction ease-out hover:text-text focus-visible:outline-1
    focus-visible:outline-offset-4 focus-visible:outline-accent md:top-24`,
  closeStart: 'md:right-0',
  // In line with the About column's right edge rather than the viewport's; on phones at the drawer's top.
  closeEnd: 'max-md:top-6 md:right-[clamp(2rem,5vw,5rem)]',
} as const;

const PANEL_SCROLL = `no-scrollbar flex h-full w-full max-w-none touch-pan-y
  flex-col overflow-x-hidden overflow-y-auto overscroll-contain px-6 pb-10 pt-24 md:pt-28`;

export const panelStyles = {
  // The scrolling column inside every panel.
  scroll: `${PANEL_SCROLL} md:max-w-drawer md:px-10`,
  // About's column on the right-hand drawer: clear of the fade toward the terrain on the left,
  // held off the viewport edge on the right.
  scrollEnd: `${PANEL_SCROLL} md:pr-[clamp(3rem,6vw,6rem)] md:pl-[clamp(3.5rem,10vw,9rem)]`,
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
