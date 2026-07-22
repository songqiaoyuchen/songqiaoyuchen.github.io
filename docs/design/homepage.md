# Homepage design direction

Status: evolving
Last reviewed: 2026-07-20

This is the detailed homepage design reference. The taste behind these choices is articulated in `preferences.md`; accepted cross-project rules are recorded in `../decisions.md`; unresolved possibilities belong in `hypotheses.md`. This revision supersedes the earlier "Terrain Console" State A/B/C model (see D-004): the homepage is now a scroll narrative, section links perform real navigation, and the interface vocabulary adopts the cartography / field-journal register (H-005, pending validation) instead of the console register.

## 1. North Star

**Cartographic descent** — a scrolling homepage that begins *inside* a perspective terrain and flattens, stage by stage, into editorial content.

> Territory → Map → Diagram → Text.

The visitor starts in atmosphere and ends in typography. The terrain never disappears while scrolling; it *flattens* — from 3D territory, to a top-down contour map, to a printed-map texture, to nothing but text on dark ground.

The site should feel:
- personal
- precise
- atmospheric
- editorial
- technically crafted

It should not feel:
- cyberpunk
- fake hacker UI
- noisy sci-fi HUD
- game menu
- pure Three.js demo
- an agency showreel

## 2. Design goals

Derived from the preference axes in `preferences.md`. Evaluate any new idea against them.

### G-1 Atmosphere is ambient, not performed (axis 5)

Keep darkness, light, grain, depth, stillness. Drop camera flights, mandatory sequences, promo choreography. The 3D terrain exists for roughly one viewport, then resolves into flat editorial territory; the only camera motion is bound to the visitor's own scroll. The negative reference is lusion.co — cinematic 3D where the animation is the product. Reaffirms D-003.

### G-2 One personally-rooted metaphor (axes 1–2)

Cartography / terrain / expedition is the single identity — cohesion the way theatre is for romanjeanelie.com. It is rooted in the actual content: travel routes, mountains, contour work, "routes through the world." Every visual element should be explainable in map terms (contour, route, station, annotation, legend, colophon). A quiet diegetic frame in this register is admissible; borrowed sci-fi, glitch, and diagnostics-as-decoration are not. No second metaphor.

### G-3 The depth gradient governs both axes (D-001, D-004)

Visual intensity decreases with navigation depth **and** with scroll position. Deeper page = flatter. Further down = flatter. One rule for the whole site.

### G-4 Craft lives in small details; the scroll stays user-owned (axis 3)

The wodniack.dev lesson: interest-density per scroll pixel, not animation volume. Many precise micro-details — hover responses, line draws, catalog index numbers, survey ticks — beat one cinematic camera system. No hijacked scroll, no snap-locked chapters, no mandatory cinematics. Animations reward attention; they never demand it.

### G-5 Content is load-bearing; the theme is a frame (axis 4)

Every section is reachable in one click. All content is readable as semantic HTML without the canvas (D-002). Content presentation stays conventional — cards, dates, tags, lists; the generic Astro/Hugo blog is the readability floor. Identity carries into content through typography, color, and line work, never through the full terrain.

### G-6 Restraint as signature; identity chrome stays compact (axes 6–7)

Near-monochrome palette with one warm accent; typography as the primary identity carrier; WebGL as material, not subject. Hero/avatar chrome must never dominate the layout — the named flaw of the otherwise-admired rainmorime.com.

## 3. Scroll narrative

Four stages, progressively flatter. Stage boundaries are semantic DOM sections; the canvas responds to scroll progress (H-001).

```txt
stage 1  TERRITORY   perspective terrain, hero, nav streams   (WebGL)
stage 2  MAP         top-down contour map, experience route    (WebGL + DOM overlay)
stage 3  DIAGRAM     project cards in a split-open strip       (DOM/SVG only)
stage 4  TEXT        recent writing + colophon footer          (DOM only)
```

### Stage 1 — Territory

The current first screen.

```txt
┌──────────────────────────────────────────────────┐
│ SONG                         PROJECTS ART ...    │
│                                                  │
│   PROJECTS │                       │ WRITING     │
│            │    Exploring ideas.   │             │
│            │    Building systems.  │             │
│   ART      │    Documenting the    │ TRAVEL      │
│            │    journey.           │             │
│            ↓                       ↓             │
│        deep perspective contour terrain          │
└──────────────────────────────────────────────────┘
```

- Perspective contour terrain fills the lower field; depth toward the horizon.
- Central hero text introduces the person; no panel chrome heavier than needed.
- Four section link streams (Projects, Art, Writing, Travel) flank the center.
- Streams are clickable and perform real navigation (see §4).
- Hover on a stream: stream brightens, terrain region responds. Light preview only — no layout shift, no focus mode.

### Stage 2 — Map

Scroll pitches the camera up and raises it until the terrain reads as a flat, near-orthographic contour map. The same contours the visitor was just inside become the map — continuity is the point.

```txt
┌──────────────────────────────────────────────────┐
│        top-down contour map (same WebGL scene)   │
│                                                  │
│     ~~~~ river ~~~~●~~~~~~~●~~~~~~~~●~~~~        │
│                    │2019    │2022     │2025      │
│                    NUS      exchange  present    │
│                                                  │
│        DOM/SVG labels anchored to the route      │
└──────────────────────────────────────────────────┘
```

- The river running through the terrain becomes the **experience timeline**: entries (education, work, milestones) anchored as stations along the route.
- Labels, dates, and connectors are DOM/SVG overlaid on the canvas — never text drawn in WebGL.
- Camera motion is bound to scroll progress but must feel like the visitor's own scrolling, not a cutscene (G-4).
- Open questions: legibility of near-ortho contours as a deliberate map (H-007), timeline anchoring across viewports (H-008).

### Stage 3 — Diagram

The canvas has fully faded out under a dark wash by the start of this stage. The page splits vertically, opening a middle strip that holds project cards.

```txt
┌──────────────────────────────────────────────────┐
│ faint printed-contour texture (static, CSS/SVG)  │
│ ┌───────── strip opens from center ────────────┐ │
│ │  ┌────────┐  ┌────────┐  ┌────────┐          │ │
│ │  │ Market │  │ Uni    │  │ Hawkeye│   ...    │ │
│ │  │ Lab    │  │ plans  │  │ Console│          │ │
│ │  └────────┘  └────────┘  └────────┘          │ │
│ │                        view all projects →   │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- Flatter than stage 2: pure DOM/SVG, no live canvas. The terrain survives only as a faint printed-map background texture.
- Depth cues are wodniack-style fakes: micro-parallax, offset shadows, layered flats. Nothing simulated.
- The split-vertical reveal should read as part of the descent — paper folding open — not a disconnected wipe (H-009).
- Cards stay compact: catalog index, title, one line, one image or mark. Full case studies live on `/projects`.

### Stage 4 — Text

The flattest content. The page ends as typography — the descent completes literally.

```txt
RECENT WRITING
01  On creativity and constraints    2026-05
02  Notes from the mountains         2026-03
03  Building in public               2026-01

read all writing →

────────────────────────────────────────
SONG · about · contact · rss
set in <fonts> · built with <stack>
```

- Two or three latest posts as a plain text list. No cards, no imagery.
- Compact colophon footer: about, contact, rss, type/stack credits. A single contour line as the divider is the only remaining terrain accent.
- This gives Writing a homepage surface (stages 2–3 cover experience and projects).

## 4. Navigation model

Two systems, one motion language.

```txt
INDEX (streams + top nav)   for the directed visitor
  click → real route change → section page
  transition: condensed descent (~700ms)

TOUR (the scroll)           for the first-time visitor
  stages 1–4, inline exits per stage
  "view all projects →", "read all writing →"
```

### The condensed-descent transition

Clicking a stream or top-nav item plays a fast version of the same flattening motion the scroll performs slowly:

```txt
click PROJECTS
  → terrain flattens / dissolves (600–900ms, dark throughout)
  → /projects fades in: dark ground, flattened contour
    accent in the header, editorial list
```

Rules:
- Section pages share the homepage's dark ground — there is never a white flash.
- Each section page opens with a flat contour accent that visually continues where the transition ended.
- Reduced motion: plain cross-fade, same duration or shorter (H-006).
- No warp tunnels, no aggressive zooms, no repeated mandatory animation.

### Shared state

Top nav and streams are one system:

```txt
hover Projects in top nav
→ Projects stream highlights
→ terrain region responds
```

Do not build separate navigation systems. Hover produces light preview only; there is no in-place focus mode (dropped by D-004).

## 5. Visual primitives

Use a small vocabulary:

```txt
perspective contour terrain
top-down contour map
route / station markers
map annotations / survey ticks
catalog index numbers (01, 02, …)
section link streams
thin borders
dotted fields
subtle metadata
grain / vignette
large editorial typography
monospace labels
printed-contour background texture
```

Avoid combining too many extras:

```txt
code rain
glitch bands
heavy scanlines
fake diagnostics
large HUD panels
rotating globe
3D objects for every section
```

## 6. Color direction

```txt
Background:        #080806
Deep surface:      #11100E
Panel surface:     rgba(8, 8, 6, 0.72)
Main text:         #F2EEE6
Muted text:        #B8AFA2
Dim text:          rgba(242, 238, 230, 0.45)
Line idle:         rgba(242, 238, 230, 0.22)
Line active:       #E8C77A
Terrain line:      rgba(200, 168, 116, 0.24)
Soft green accent: #A8E6B0 optional, use sparingly
```

Use warm ivory/gold more than neon green. Green can appear as a tiny system accent, not the main brand color. Section pages inherit this ground (required by the no-white-flash rule in §4).

## 7. Typography

Suggested pairing (unresolved balance: H-002):

```txt
Hero serif:    Playfair Display / Cormorant Garamond / similar
UI sans:       Inter / Neue Haas Grotesk-like
Metadata mono: JetBrains Mono / IBM Plex Mono
```

Hierarchy:

```txt
hero headline:   large serif
section labels:  uppercase mono/sans, letter-spaced
timeline/cards:  mono or small sans
stage 4 list:    body-first, fully readable
```

## 8. Motion language

Motion should be calm and purposeful.

Allowed:

```txt
scroll-bound camera pitch/rise (stages 1→2)
canvas fade under dark wash (stage 2→3)
split-vertical reveal (stage 3)
stream brighten on hover
terrain local response
line draw
condensed-descent route transition
micro-parallax on flat layers
```

Avoid:

```txt
scroll hijacking / snap-locked chapters
fast camera flights
constant animated effects
glitch spam
particles everywhere
```

Scroll rules (G-4):
- The scrollbar is honest: page length is real, scrubbing works, no inertia override.
- Camera binding is a pure function of scroll progress — reversing the scroll reverses the descent.
- `prefers-reduced-motion`: each stage renders as a static composition; the camera does not animate; route transitions become plain fades.

Timing suggestions:

```txt
stream hover:        150–250ms
route transition:    600–900ms
stage cross-fades:   tied to scroll distance, not time
```

## 9. Mobile adaptation

Do not force the desktop composition onto mobile. Stages stack as simplified, mostly static compositions (H-003).

```txt
stage 1: header + intro text + terrain strip + section list
stage 2: static map image/reduced canvas + vertical timeline list
stage 3: single-column project cards, no split animation
stage 4: unchanged (already the flattest)
```

Mobile rules:
- no tiny hit targets; section navigation is a clear list
- no drag-first or hover-dependent interaction
- simplify terrain density; reduce grain/noise
- timeline reads as a plain vertical list with dates

## 10. Implementation architecture

```txt
<HomePage>
  <TerrainCanvas />        stages 1–2 only; pause/unmount after fade-out
  <TerrainFadeMask />
  <TopNav />
  <LinkStreams />
  <HeroText />             stage 1
  <ExperienceRoute />      stage 2 DOM/SVG overlay
  <ProjectStrip />         stage 3
  <WritingList />          stage 4
  <ColophonFooter />       stage 4
  <AtmosphereOverlay />
</HomePage>
```

Shared state:

```ts
state:
  scrollProgress          // drives camera rig + stage cross-fades
  activeStage             // 1 | 2 | 3 | 4, derived from scrollProgress
  hoveredSection          // light preview only
  reducedMotion
```

Core principles:
- UI and content are HTML/SVG; terrain is WebGL; state connects them (D-002).
- Stage boundaries are semantic DOM sections — content exists and is indexable without the canvas (H-001).
- The canvas stops consuming GPU once stage 2 has faded out.

## 11. Build order

### Phase 1 — Descent prototype

The riskiest assumption first: scroll-bound camera pitch/rise on the existing terrain until it reads as a top-down map (H-007). Leva-tunable. No content yet.

### Phase 2 — Experience route

River route + timeline stations as DOM/SVG overlay on the stage 2 map (H-008). Real experience data.

### Phase 3 — Flat stages

Stage 3 project strip (split reveal, H-009) and stage 4 writing list + colophon as plain DOM. These are cheap and content-real.

### Phase 4 — Route transitions and section pages

Condensed-descent transition (H-006); section page headers with the flat contour accent and shared dark ground.

### Phase 5 — Quality pass

Mobile simplification, reduced motion, WebGL-unavailable fallback, performance, accessibility.

## 12. Final design rule

The site should not say:

> look, I can build 3D.

It should say:

> this is a clear, personal, atmospheric interface for exploring my work, writing, art, and travels — and it gets out of the way the deeper you go.

Three.js is a material layer, not the identity.
