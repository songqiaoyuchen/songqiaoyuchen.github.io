# Architecture

Status: evolving  
Last reviewed: 2026-07-19

## Current stack

- Next.js App Router with React and TypeScript.
- Tailwind CSS patterns should dominate styling.
- React Three Fiber, Three.js, Drei, and post-processing for the terrain experience.
- GSAP ScrollTrigger for the homepage's coordinated DOM/WebGL scroll-transition timeline.
- Rehype Pretty Code and Shiki for build-time article syntax highlighting.
- Custom GLSL shaders and generated font/texture atlases.
- Static assets in `public/` and tuned visual configuration in `config/`.

## Intended system boundaries

### Content and routes

Pages, headings, navigation, article text, metadata, and links should be represented by semantic HTML rendered through the App Router. Pages should be Server Components unless they need state, events, or browser APIs.

### Interactive UI

Small Client Components own interaction state and connect HTML/SVG interface elements to visual effects. Client boundaries should stay narrow so content does not inherit unnecessary JavaScript.

### Terrain and atmosphere

The WebGL scene owns terrain rendering, shader animation, contour lines, and atmospheric effects. It should not be the only representation of navigation or content.

### Content source

Writing uses local MDX in `content/<slug>/index.mdx` (D-007). A server-only adapter in
`lib/content/articles.ts` discovers articles and normalizes their metadata for route layouts and indexes.
Route components should depend on that normalized record rather than on filesystem details so a future CMS
can replace the loader without redesigning the editorial UI.

## Page-depth model

| Depth | Rendering emphasis | Visual intensity |
| --- | --- | --- |
| Homepage | Semantic shell plus optional WebGL enhancement | High |
| Section index | Server-rendered editorial layout | Low to medium |
| Article or case study | Server-rendered reading layout | Minimal |

## Current implementation risks to address incrementally

- The homepage page component currently establishes a broad client boundary.
- Full-screen global overflow behavior will conflict with scrolling content pages.
- Development controls and free camera controls are present in the scene composition.
- Remote Google font fetching makes production builds dependent on font-network availability.
- No automated browser, accessibility, or content-route tests exist yet.

These are not instructions to refactor everything immediately. Address them in the smallest relevant vertical slice.

## Verification strategy

- Static checks: lint, TypeScript through the production build, and build output.
- Visual checks: representative desktop, tablet, and mobile viewports.
- Interaction checks: keyboard, pointer, touch, Escape/focus behavior, and reduced motion.
- Failure checks: WebGL unavailable, asset failure, and slow initial loading.
- Content checks: semantic heading structure, route metadata, crawlable links, and readable no-animation states.

## Open architecture questions

- Shape of project, article, art, and blog content records.
- ~~Whether scroll choreography needs a small motion dependency or can remain native.~~ Resolved by D-005: GSAP ScrollTrigger owns the homepage transition timeline.
- Performance quality tiers for mobile and lower-power GPUs.
- Deployment, analytics, search, and image-delivery choices.
