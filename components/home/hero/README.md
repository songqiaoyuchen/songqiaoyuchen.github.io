# components/home/hero

Homepage introduction. On desktop the name itself is drawn in WebGL (`scene/text/SceneHeroName`);
the HTML `h1` stays for screen readers, and becomes visible in the terrain fallback.

| File | Purpose |
| --- | --- |
| `HeroLayer.tsx` | `<main>` placing the hero for mobile (in flow) and desktop (absolute) |
| `Hero.tsx` | Eyebrow, name and supporting lines; fades out when a section opens |
| `Hero.styles.ts` | Tailwind classes for the hero |
| `TypeReveal.tsx` | Typewriter reveal of a line of text |
| `Hero.css` | Hero keyframes and the `.hero-type-reveal` animation |

Copy: `data/hero.ts`. Positions and delays: `config/hero.ts`.
