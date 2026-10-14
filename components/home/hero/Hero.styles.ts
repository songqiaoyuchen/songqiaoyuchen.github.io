// Tailwind classes for the homepage hero (Hero.tsx); desktop positions come from config/hero.ts.
// Mobile top padding clears the nav and the frosted band fading out below it (top-nav-glass).
export const heroStyles = {
  section: `absolute inset-0 z-30 flex flex-col justify-start px-6 pt-28 pb-8 sm:pt-36 font-mono text-left
    transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-opacity
    motion-reduce:duration-150 md:block md:w-auto md:max-w-none md:p-0 md:pointer-events-none`,
  shown: 'pointer-events-none translate-y-0 opacity-100',
  hidden: 'pointer-events-none -translate-y-2 opacity-0',

  eyebrow: `m-0 text-hero-eyebrow leading-[1.4] tracking-eyebrow
    text-muted-soft uppercase md:absolute md:top-(--hero-eyebrow-top)
    md:left-(--hero-annotation-left) md:text-hero-annotation`,
  // Blinking typewriter cursor after the eyebrow.
  eyebrowText: `relative whitespace-nowrap after:absolute after:top-[0.15em] after:left-full
    after:h-[1em] after:w-px after:animate-hero-cursor after:bg-accent-muted
    after:content-[''] motion-reduce:after:hidden motion-reduce:after:animate-none`,

  name: `mt-3 mb-0 translate-y-2 animate-hero-name text-hero-title leading-[0.85]
    font-normal tracking-role opacity-0 blur-reveal
    transition-[color,text-shadow] duration-300 ease-out
    motion-reduce:translate-y-0 motion-reduce:animate-none motion-reduce:opacity-100
    motion-reduce:blur-none motion-reduce:transition-none md:m-0`,
  // The WebGL name (SceneHeroName) shows normally; the HTML one appears only in the terrain fallback.
  nameHtml: `text-accent-soft text-shadow-(--shadow-hero)
    md:absolute md:top-[34svh] md:left-[54.5vw] md:text-[clamp(3.5rem,7vw,6rem)]`,
  // Mobile keeps the name's box in flow (transparent) for the WebGL name to cover; desktop positions it freely.
  nameWebGl: 'text-transparent md:sr-only',

  supporting: `mt-7 mb-0 grid gap-3 text-hero-support leading-[1.55] tracking-support
    text-muted-soft uppercase md:absolute md:top-(--hero-supporting-top)
    md:left-(--hero-annotation-left) md:m-0 md:grid md:gap-2
    md:w-[min(40vw,var(--container-annotation))]
    md:text-hero-annotation`,
  supportingLine: `block translate-y-1 opacity-0 motion-reduce:translate-y-0
    motion-reduce:animate-none motion-reduce:opacity-100`,
  supportingLineFirst: 'animate-hero-support-first',
  supportingLineLast: 'animate-hero-support-last',

  // HeroLayer: mobile overlays the scene in flow; desktop positions absolutely over it.
  mobilePlacement: 'pointer-events-none relative -mt-[100svh] h-svh md:hidden',
  desktopPlacement: 'hidden md:block',
} as const;
