# Design hypotheses

This file contains possibilities to test. Nothing here is a requirement unless it is promoted to `docs/decisions.md`.

## Experiment template

### H-XXX: Short name

Status: exploring  
Confidence: low | medium | high

**Hypothesis**

Describe the proposed relationship or preference.

**Why it may fit**

Describe the evidence, reference, or reaction behind it.

**Keep constant**

List the variables that should not change during comparison.

**Test on**

List representative routes, content, viewports, and interaction states.

**Success signal**

Describe what would make the hypothesis worth accepting.

**Result**

Leave blank until tested. Link screenshots, commits, or prototypes where useful.

## Active hypotheses

### H-012: Contour Survey versus SQYC Type Build preloader

Status: resolved
Confidence: medium

**Hypothesis**

A full-screen preloader can make genuine homepage scene startup feel intentional without becoming a separate
showreel. Two variants should be compared: sparse contour surveying that hands directly into the terrain, and a
restrained SQYC glyph build that emphasizes the site's typographic identity.

**Why it may fit**

Both variants reuse existing visual language and avoid invented diagnostics, percentages, or an unrelated logo
animation. The contour direction offers the strongest terrain continuity; the type direction may produce a
clearer identity-first opening.

**Keep constant**

Background, palette, loader duration, readiness signal, exit dissolve, reduced-motion behavior, failure escape,
and the loaded homepage composition.

**Test on**

Cold and cached homepage visits at approximately 390 px, 768 px, and 1440 px, plus internal return navigation,
reduced motion, slow loading, and the static fallback.

**Success signal**

The chosen variant reads as part of the site, hides incomplete scene construction, does not make cached returns
feel slower, and hands into the loaded homepage without a visual flash or focus loss.

**Result**

2026-07-29 — The two variants were initially combined as a centered SVG mountain-contour icon with a restrained
SQYC wordmark. On 2026-08-01, user testing exposed an inherent interruption when the one-shot contour drawing
was synchronized to coarse readiness milestones. The accepted revision uses the user's manually drawn contour:
its five rings form one compound path with a uniform outer-to-inner loop, while a separate Krypton count runs
smoothly toward 90 and reserves 100 for genuine scene readiness. The variant switcher remains removed, while
`/#preview=1` provides a short development preview.

### H-011: Asymmetric homepage overview

Status: exploring
Confidence: medium

**Hypothesis**

At desktop and tablet widths, concentrating the four section streams in a left-side field and placing a large, unboxed introduction on the right will create a stronger identity-first hierarchy than the centered spread.

**Why it may fit**

The asymmetry gives navigation and identity distinct roles while leaving the terrain as the shared atmospheric ground. It also creates a more deliberate visual counterweight between the dense stream cluster and the open typographic field.

**Keep constant**

Terrain and camera framing, stream order and hit targets, the focused drawer composition, and the existing fade/glitch swap between overview and focused stream layouts.

**Test on**

The homepage at approximately 390 px, 768 px, and 1440 px, including every section focus state, keyboard focus, and reduced motion.

**Success signal**

The overview reads immediately as navigation on the left and personal introduction on the right without overlap or clipping, while mobile and every focused state retain their existing balance and usability.

**Result**

2026-07-22 — Exploration implemented with desktop/tablet stream slots spanning NDC x -0.86 to -0.36 and a large introduction in an upper-right field ending at 60% viewport height. Browser checks at 1440 px and 768 px confirmed clear separation between the stream cluster and introduction; the 390 px composition retained its previous centered hero and symmetric stream slots. All four stream controls and all four top-navigation controls retained the existing focused drawer and fade/glitch layout swap.

### H-010: Interim single-page index composition

Status: exploring  
Confidence: medium

**Hypothesis**

Until the longer scroll narrative is built, the homepage can work as a compact identity-first index: contact-only top navigation, an unboxed central introduction, four spatial section links on desktop, and a two-viewport intro-to-index composition on mobile. Stream hover should remain a light visual response with no preview panel.

**Why it may fit**

It shortens the path to a usable homepage while preserving the terrain identity, one-click routes, semantic HTML navigation, and a mobile composition that does not depend on hover or precise WebGL hit regions.

**Keep constant**

Terrain rendering, palette, section destinations, and the later cartographic-descent direction.

**Test on**

The homepage at approximately 390 px, 768 px, and 1440 px, including keyboard focus, touch targets, reduced motion, and WebGL-unavailable behavior.

**Success signal**

Visitors understand who Song is and can reach Projects, Art, Writing, Travel, and About without the layout feeling crowded. The interim layout should be easy to extend into the accepted scroll narrative later.

**Result**

### H-001: Hybrid homepage-to-content transition

Status: exploring  
Confidence: medium

**Hypothesis**

Semantic DOM sections should control the scrolling narrative while the WebGL terrain responds to scroll progress, rather than placing the content itself inside the canvas or making the camera the only navigation mechanism.

**Why it may fit**

It could preserve the homepage's spatial identity while keeping content readable, indexable, and adaptable to mobile.

**Keep constant**

Homepage palette, terrain material, navigation labels, and representative content.

**Test on**

One homepage-to-writing transition at desktop and mobile widths, including keyboard and reduced-motion behavior.

**Success signal**

The transition feels continuous and intentional without delaying access to content or requiring WebGL.

### H-002: Editorial, technical, and hybrid typography directions

Status: exploring  
Confidence: low

**Hypothesis**

The site identity may be best expressed by an editorial display face, a highly readable body face, and restrained monospace metadata, but the exact balance is unresolved.

**Keep constant**

Content, color, spacing, and layout.

**Test on**

Homepage introduction, section heading, long-form article, project metadata, and navigation at approximately 390 px and 1440 px.

**Success signal**

The system feels distinctive on the homepage, remains comfortable for long reading, and does not become a generic magazine or technical-documentation aesthetic.

### H-003: Mobile terrain as an accent rather than the full composition

Status: exploring  
Confidence: medium

**Hypothesis**

Mobile should use a reduced terrain field or strip with explicit HTML navigation and content, instead of reproducing the desktop spatial composition at a smaller scale.

**Test on**

Common narrow viewports, lower device pixel ratios, touch navigation, reduced motion, and WebGL-unavailable fallback.

**Success signal**

The mobile experience retains the identity while navigation and content remain immediately legible and responsive.

### H-004: Final information architecture and naming

Status: exploring  
Confidence: low

**Hypothesis**

Projects, Writing, Art, Travel, and About are the likely top-level areas, but the implementation currently uses inconsistent combinations and `Writing` versus `Blog` is unresolved.

**Test on**

Homepage navigation, mobile navigation, section previews, URL structure, and the first representative content set.

**Success signal**

Visitors can predict what each section contains, and the names feel personal rather than template-like.

### H-005: Cartography register instead of console register

Status: exploring  
Confidence: low

**Hypothesis**

The homepage identity may read better in a cartography / field-journal register — terrain as surveyor's map, panels as expedition notes, labels as map annotations — than in the current console/hologram register ("Terrain Console", "holographic panel", "nav rays").

**Why it may fit**

The console vocabulary pulls toward the sci-fi HUD aesthetic listed as an anti-goal, while the admired references derive cohesion from a metaphor rooted in the author's life (see `preferences.md`, axes 1, 2, and 5). Terrain, routes, and travel are the personally-rooted material here, and a cartographic frame also fits the Travel and Writing sections. It shifts atmosphere from performed (cinematic 3D showcase) toward ambient (editorial, typography-led with WebGL accents).

**Keep constant**

Palette, terrain geometry and material, information architecture, and hero panel content.

**Test on**

Homepage overview and section-focus states at desktop and mobile widths: rename and restyle the interface vocabulary (panel chrome, ray/route treatment, label conventions) without changing layout or content.

**Success signal**

The homepage feels more personal and less like a game menu or promo site, while remaining as navigable; the interface language extends naturally to section pages without carrying the full terrain.

**Result**

### H-006: Condensed-descent route transition

Status: exploring  
Confidence: medium

**Hypothesis**

Clicking a section link can play a fast (~600–900ms) version of the scroll's flattening motion — terrain dissolves, section page fades in on the same dark ground with a flat contour accent — and this will read as "fast-forwarding the descent" rather than as a gimmick or an abrupt jump.

**Why it may fit**

It unifies the two navigation systems (index clicks and scroll tour) under one motion language without reintroducing an in-place focus state, and it removes the white-flash abruptness that made direct navigation feel wrong (see D-004).

**Keep constant**

Palette, section page layout, link stream placement, and top-nav behavior.

**Test on**

Homepage → /projects and homepage → /writing at desktop and mobile widths, with reduced motion (plain cross-fade fallback) and with the browser back button.

**Success signal**

The transition feels continuous and intentional on repeat use, never delays content beyond ~900ms, and reduced-motion users get an equivalent non-animated cut.

**Result**

### H-007: Top-down camera handoff legibility and cost

Status: exploring  
Confidence: medium

**Hypothesis**

Scroll can drive the existing terrain camera to a near-orthographic top-down view where the same contours read as a deliberate flat map, and this camera binding stays smooth on mid-range hardware.

**Why it may fit**

Reusing the live terrain gives perfect visual continuity between stage 1 (territory) and stage 2 (map) — the visitor watches the territory become the map — and avoids maintaining a second contour visual system.

**Keep constant**

Terrain geometry, contour material, palette, and stage boundaries.

**Test on**

Scroll from stage 1 to stage 2 (including reverse scrubbing) at desktop widths, on integrated graphics, and with reduced motion (static per-stage compositions).

**Success signal**

The top-down view reads as an intentional map rather than a degenerate 3D angle, contour density stays legible, and frame time stays acceptable during the whole descent.

**Result**

2026-07-20 — Descent prototype built: scroll-bound `CameraRig` using a Catmull-Rom position arc and quaternion slerp, ending at (4.8, 21.6, 0.3) looking straight down with a -93° heading. The default FOV remains 50 throughout; `Map FOV` stays available in Leva for framing experiments, but a dolly-zoom is not part of the intended motion. The top-down view reads as a deliberate contour map, with major/minor lines remaining legible over the shaded terrain. Two findings remain: (1) fog must widen during the rise (currently near 7.5 → 12, far 16.5 → 56) or the map is swallowed by the stage-1 fog band; (2) the stage-1 text streams must fade out during the descent (currently progress 0.34–0.58) because they read as noise from above. The earlier tuning was verified with forward/reverse screenshots and measured on an Intel UHD 630 dev build at avg 19.8 ms / median 19.0 ms / p95 29.7 ms, versus a 16.7 ms stage-1 resting baseline. Because the endpoint and fade tuning changed afterward, the current values still need fresh visual and performance verification. Desktop-only so far; mobile/reduced-motion static compositions remain open (build-order phase 5). All endpoints live in `TERRAIN_CONFIG.descent`, with a Leva "Descent" folder and free-camera debug toggle for reframing.

2026-07-20 — Ownership refactor accepted in D-005: GSAP ScrollTrigger now owns one timeline spanning the 180svh descent, 100svh map hold, and 100svh wash. The former Zustand progress store, CameraRig frame loop, and per-component scroll readers were removed. The controller preserves the Catmull-Rom/quaternion camera math while applying camera, fog, stream uniforms, hit-target interaction, DOM wash, and canvas pause directly. Forward and reverse scrubbing, reverse wake-up from demand rendering, refresh-to-top, and exact wash/project alignment were verified at 390px, 768px, and 1440px widths with no console errors. Mobile reduced-motion composition and fresh hardware frame-time measurement remain open.

### H-008: River route as experience timeline

Status: exploring  
Confidence: low

**Hypothesis**

Experience entries (education, work, milestones) can be anchored as stations along the river route on the stage 2 map, with DOM/SVG labels, and remain legible without fighting the map for contrast.

**Why it may fit**

It turns the timeline into cartography — a journey drawn on the personal territory — which is the strongest expression of the governing metaphor (preference axes 1 and 2) and gives stage 2 real content rather than decoration.

**Keep constant**

Map rendering, palette, and the actual experience data.

**Test on**

Stage 2 at ~390px and ~1440px widths, with 4–8 timeline entries, keyboard navigation to each station, and the reduced-motion static composition.

**Success signal**

Entries are readable and scannable in order, the route stays visually primary over the contours, and the mobile fallback (plain vertical list) loses no information.

**Result**

### H-009: Split-vertical reveal for the project strip

Status: exploring  
Confidence: low

**Hypothesis**

Stage 3 can open through a split-vertical reveal — the page parting from the center to expose the project strip — that reads as part of the descent (paper folding open) rather than as a disconnected wipe effect.

**Why it may fit**

It gives the flattest content stages one distinctive structural moment without reintroducing canvas or camera work, in the wodniack register of precise, content-attached animation.

**Keep constant**

Card content, printed-contour background texture, and scroll pacing of adjacent stages.

**Test on**

Stage 2 → stage 3 scroll transition (forward and reverse) at desktop widths; mobile fallback (no split, single-column stack); reduced motion (strip simply present).

**Success signal**

The reveal feels like a continuation of the flattening narrative, works scrubbed in both directions, and its absence on mobile/reduced-motion does not harm comprehension.

**Result**
