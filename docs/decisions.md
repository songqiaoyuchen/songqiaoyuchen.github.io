# Decision log

Only accepted decisions belong here. Tentative ideas belong in `design/hypotheses.md`.

## Entry template

### D-XXX: Short decision title

Status: accepted | superseded  
Date: YYYY-MM-DD  
Scope: product | design | architecture | content | workflow

**Decision**

State what is now the default.

**Reason**

State the evidence and tradeoff that led to it.

**Consequences**

State what future work should do differently.

**Supersedes**

Link an older decision when applicable.

## Accepted decisions

### D-001: Visual intensity decreases with page depth

Status: accepted  
Date: 2026-07-19  
Scope: product, design

**Decision**

The homepage may be immersive and visual-first. Section pages are content-first and visually restrained. Articles and detail pages are reading-first and minimally animated.

**Reason**

The site needs both a distinctive identity and a durable, comfortable home for substantial content.

**Consequences**

Do not place the full terrain experience behind long-form reading pages. Carry identity into deeper pages through typography, color, line work, spacing, and small atmospheric accents.

### D-002: HTML/SVG owns interface and content; WebGL owns terrain

Status: accepted  
Date: 2026-07-19  
Scope: architecture, design

**Decision**

Navigation, text, controls, and content are implemented in semantic HTML or SVG. WebGL renders terrain and atmospheric effects. Shared state may connect the layers.

**Reason**

This separates visual expression from content access and supports responsive layout, SEO, accessibility, and graceful failure.

**Consequences**

Do not make canvas hit regions the only way to discover or enter a section. Important information and actions need semantic equivalents.

### D-003: Three.js is a material layer, not the site's subject

Status: accepted  
Date: 2026-07-19  
Scope: product, design

**Decision**

Technical spectacle should support the personal identity and content rather than dominate them.

**Reason**

The intended impression is a clear, personal, atmospheric interface—not a generic 3D demonstration or game menu.

**Consequences**

Evaluate new visual effects by whether they improve meaning, hierarchy, or atmosphere. Avoid effects added solely to display technical complexity.

### D-004: The depth gradient extends to the scroll axis; section links are real routes

Status: accepted  
Date: 2026-07-20  
Scope: product, design

**Decision**

The homepage is a scroll narrative that flattens progressively — territory (perspective terrain) → map (top-down contours with the experience route) → diagram (project cards) → text (writing list and colophon). Clicking a section link stream performs a real route change into a content-first section page, using a condensed (~600–900ms) version of the scroll's flattening motion. The in-place section-focus state (the former homepage State B) is dropped; hover produces only a light preview.

**Reason**

The site is moving from the Lusion register (performed, cinematic 3D) toward ambient atmosphere and content-first presentation (`design/preferences.md`, axes 4–5). Real navigation reaches content in one click and avoids building and maintaining an intermediate focus mode. Abruptness is prevented by design rather than by an extra state: section pages share the homepage's dark ground and open with a flat contour accent, so the transition reads as fast-forwarding the descent rather than a jump.

**Consequences**

Section pages must use the dark palette and a flattened contour header accent — never a white flash. Each scroll stage carries its own inline exit ("view all projects →", "read all writing →"), so the scroll tour reaches content without the streams. The WebGL canvas exists for stages 1–2 only and stops consuming GPU once faded out. D-001 and D-002 are unchanged and reinforced; scroll behavior must satisfy the user-owned-scroll rule (preference axis 3).

**Supersedes**

The State A/B/C single-screen model in `design/homepage.md` (previous revision).

### D-005: GSAP owns the homepage scroll-transition timeline

Status: accepted  
Date: 2026-07-20  
Scope: architecture, design

**Decision**

GSAP ScrollTrigger is the single owner of homepage scroll-transition timing and smoothing. It applies the camera pose, fog range, stream visibility, DOM wash, and canvas pause boundary directly. React Three Fiber continues to own rendering, resources, continuous shader time, and pointer interaction; semantic DOM sections and native browser scrolling remain the source geometry for the timeline.

Do not maintain a parallel scroll-progress store or a second camera animation loop. Camera-path and quaternion calculations remain pure scene-transition functions driven by GSAP progress.

**Reason**

The accepted four-stage narrative coordinates WebGL and DOM behavior across descent, map hold, wash, project reveal, and reverse scrolling. A single timeline makes those relationships explicit. Keeping native scroll listeners, Zustand progress, CameraRig damping, and GSAP simultaneously would create competing sources of truth and unnecessary lifecycle complexity.

**Consequences**

Use one scoped ScrollTrigger controller with explicit cleanup. Mutate Three.js objects and shader uniforms directly during the high-frequency transition; use React state only for low-frequency boundaries such as pausing the canvas. ScrollSmoother, snapping, and scroll hijacking are not defaults and require separate acceptance. Reduced-motion behavior remains an explicit alternate composition rather than an incidental timeline setting.

### D-006: No linear movement for streams

Status: accepted  
Date: 2026-07-20 1
Scope: design, animation

**Decision**

The LinkStreams and DecorativeStreams tsx component should not have visible movement in the 3D scene. During open/close of the preview drawer,
The LinkStreams should simply fade out and in with the pixel glitch transition that is currently implemented.

**Reason**

Reduce motion and scene complexity. Avoid visual noise.

### D-007: Writing uses local MDX with statically generated article routes

Status: accepted
Date: 2026-07-29
Scope: architecture, content, workflow

**Decision**

Writing is authored as local MDX in `content/<slug>/index.mdx`. Article folders are discovered by
the server-side content adapter, and Next.js pre-renders the corresponding `/blog/[slug]` routes at build
time. MDX may use a small registered component vocabulary for editorial media and callouts.

**Reason**

The site needs rich editorial pages with images and code, crawlable HTML, minimal client JavaScript, and a
publishing workflow proportionate to a personal site. Local MDX provides those properties without adding a
CMS or database before a non-code authoring need exists.

**Consequences**

Publishing a new article requires adding its MDX folder and deploying a new build. Content-source details
remain behind `lib/content/articles.ts` so a future CMS can replace the loader without changing article
layouts. Interactive archive controls may be Client Components; article content remains server-rendered.

### D-008: Article prose and code use distinct typographic roles

Status: accepted
Date: 2026-07-29
Scope: design, architecture, content

**Decision**

Long-form article titles, decks, headings, and prose use a readable editorial serif stack. Krypton remains
the typeface for metadata, inline code, and fenced code. Fenced code is highlighted at build time and uses
line numbers, a language label, horizontal overflow, and a small copy control.

**Reason**

Krypton carries the site's identity but is tiring across long passages. Separating prose from code improves
reading comfort while preserving the visual language in compact UI and technical material. Build-time
highlighting follows the rich but low-runtime-cost code treatment accepted from the supplied reference.

**Consequences**

Do not use Krypton for long-form article prose. New fenced code blocks should include a language identifier
so their label and highlighting are meaningful; the article route should not load a browser-side highlighter.
