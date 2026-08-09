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

### D-009: Mobile homepage uses a two-stage introduction and index

Status: superseded
Date: 2026-07-29
Scope: design, interaction

**Decision**

Below the mobile breakpoint, the homepage uses two full-height stages: the greeting first and the link-stream
index second. A visible scroll cue connects them. Native touch scrolling remains the input, with smooth
programmatic movement, viewport snapping, and a damped pixel-dissolve reveal for the streams.

**Reason**

Separating identity and navigation prevents either from being clipped or compressed on narrow screens while
keeping both one gesture apart. The existing pixel dissolve preserves the established stream motion language.

**Consequences**

Mobile stream controls are evenly spaced across the second viewport and are not interactive before that stage.
Desktop and tablet retain the single-screen composition. The mobile two-stage snap is a narrow exception to
the general no-snap rule in the homepage design direction; reduced-motion mode removes the damped reveal.

**Superseded by**

D-011.

### D-010: The homepage uses a functional full-screen terrain preloader

Status: accepted
Date: 2026-07-29
Scope: design, architecture, performance

**Decision**

The homepage is covered by a full-screen preloader until the first complete WebGL terrain frame is ready. The
screen represents genuine loading only: production adds no minimum display time, cached returns pass through
as soon as the scene is ready, and any return that remains slow receives the same loading treatment. The final
loader uses a centered, manually drawn SVG contour with a Krypton count below it. The five rings form one
compound outer-to-inner path with a single uniform travelling highlight, independent of readiness. The visible
count also runs independently from zero toward 90; genuine scene readiness alone releases 100 and begins the
exit. Production does not wait for a separate progress-completion animation. The SVG is present in the initial
rendered markup, and WebGL
initialization begins only after the browser has painted that lightweight loading surface.

**Reason**

The homepage scene has a material startup cost and an incomplete scene is visually misleading. A designed
loading screen provides a deliberate handoff while the pre-baked terrain pipeline removes avoidable transfer
and main-thread work. Both variants remain inside the established cartographic and typographic vocabulary.

**Consequences**

The preloader must cover navigation, prevent interaction with incomplete content, respect reduced motion, and
exit only after scene assets, preparation, and two complete frames. Scene or asset failure reveals the static
semantic fallback, and an eight-second escape action prevents loading from trapping the visitor. Content routes
do not receive the homepage preloader.

### D-011: Mobile homepage uses one viewport for identity and navigation

Status: accepted
Date: 2026-07-29
Scope: design, interaction

**Decision**

Below the mobile breakpoint, the greeting and evenly spaced link streams share one full-height homepage.
The stream row occupies the open space below the introduction and remains immediately interactive.

**Reason**

Representative phone viewports have enough vertical space for both elements without compressing either.
Keeping them together removes an unnecessary gesture and exposes the site index immediately.

**Consequences**

The mobile homepage does not snap or scroll between introduction and navigation stages, and it has no scroll
cue or scroll-driven stream reveal. Mobile stream placement remains tunable through the existing development
controls. Desktop and tablet composition remains unchanged.

### D-012: Decorative streams use a restrained stepped glyph cascade

Status: accepted
Date: 2026-08-01
Scope: design, animation, performance

**Decision**

DecorStreams keep fixed world-space anchors while their glyph content advances downward in a subtle,
seeded 12 Hz cascade. Individual glyphs swap independently at varied low frequencies. The blurred depth
layers refresh only on cascade ticks, and reduced-motion mode freezes the effect on a deterministic frame.
LinkStreams remain positionally static and retain their existing interaction glitch.

**Reason**

The falling and swapping characters add the requested ambient life without moving navigation, changing the
scene composition, or forcing the decor compositor to rerender at display refresh rate.

**Consequences**

Decor streams remain a live shader layer and must not be baked into the terrain texture. New tuning should
preserve asynchronous stream phases, sparse swaps, fixed anchors, and a static reduced-motion presentation.

**Supersedes**

D-006 for DecorStreams only. D-006 continues to govern LinkStreams.

### D-013: Decorative streams use Lusion's continuous depth-composited rays

Status: accepted
Date: 2026-08-09
Scope: design, animation, performance

**Decision**

DecorStreams follow the text-ray treatment used by Lusion's About-page hero. Shader time advances
continuously, character rows fall at independently seeded rates, and four camera-depth groups accumulate in
one full-resolution render target. The far-to-near groups receive deterministic separable blur passes at
16, 8, and 4 pixels before the nearest group is added crisp. Reduced-motion mode freezes the same composition
on a deterministic frame.

**Reason**

The former 12 Hz reduced-resolution compositor made distant groups visibly flicker as animated glyphs and
blurred snapshots changed together. Matching the reference's continuous update and full-resolution
accumulation removes that temporal discontinuity while preserving the intended depth hierarchy.

**Consequences**

DecorStreams render their compositor every active animation frame. Future performance tuning may adjust the
number of streams or disable animation by quality tier, but must not reintroduce stepped compositor updates,
independently composited near layers, or alternating reduced-resolution accumulation targets.

**Supersedes**

D-012. D-006 continues to govern LinkStreams.

### D-014: Decorative depth blur is isolated per group

Status: accepted
Date: 2026-08-09
Scope: design, animation, performance

**Decision**

Each DecorStreams depth group renders into an isolated layer. The three rear groups receive one assigned
separable blur at 16, 8, and 4 pixels respectively, the nearest group remains crisp, and the finished layers
are then added together. Falling-row speeds use the range 1–5 rows per second, half the previously accepted
range.

**Reason**

Reusing one accumulated image through all three blur stages caused the farthest rays to be blurred at 16,
then 8, then 4 pixels. That compounded softness was excessive in this scene even though the sequence follows
the Lusion reference. Isolating the layers preserves a legible depth progression while preventing previously
blurred pixels from entering another blur pass.

**Consequences**

The compositor needs a full-resolution layer target in addition to its accumulation and half-resolution blur
targets. Blur tuning remains a per-depth-group concern; do not feed the accumulated image back into a later
group's blur pass.

**Supersedes**

D-013 for blur accumulation and movement speed. D-013 continues to govern continuous shader time, glyph
behavior, and the Lusion-derived ray treatment. D-006 continues to govern LinkStreams.

### D-015: Decorative rays use a lighter depth ramp and longer center streams

Status: accepted
Date: 2026-08-09
Scope: design, animation

**Decision**

The three rear DecorStreams groups use isolated blur radii of 8, 4, and 2 pixels, with the nearest group
remaining crisp. All decorative streams are longer than the original layout, and streams projected near the
screen center receive an additional seeded length boost without changing their anchors.

**Reason**

The former 16-pixel rear layer was visibly over-blurred; the existing 8-pixel second layer already provided
the desired maximum softness. Longer center-weighted columns strengthen the middle composition and reduce
the frequency with which the moving packet mask hides a whole short stream.

**Consequences**

Future depth tuning should preserve 8 pixels as the current softness ceiling unless new visual evidence
supports changing it. Stream-length tuning may change glyph count, but must not reposition the fixed terrain
anchors.

**Supersedes**

D-014 for numeric blur radii and stream-length tuning. D-014 continues to govern isolated per-group blur and
the 1–5 rows-per-second movement range.

### D-016: Decorative streams render at full height with a fast local packet

Status: accepted
Date: 2026-08-09
Scope: design, animation

**Decision**

Every DecorStream renders across its complete configured length as soon as the scene is visible. A separate
2–4-character brightness packet travels upward at 8–14 rows per second; falling rows, independently changing
glyphs, endpoint fades, and depth blur continue normally behind it.

**Reason**

The reference-derived implementation used a 50-row visibility transition. At the site's reduced falling-row
speed, that transition took roughly 10–50 seconds to cross a stream and made columns look as though they were
slowly growing. The intended effect is a short, quick packet moving over an already complete column.

**Consequences**

Configured glyph count directly determines the continuously visible column length. Packet speed and width
remain independent from the slower falling-row speed so future movement tuning cannot reintroduce the long
reveal.

**Supersedes**

D-013 for packet width, speed, and visibility behavior. D-013 continues to govern continuous shader time and
glyph randomization; D-015 continues to govern length and blur tuning.

### D-017: Decorative streams return to their original height range

Status: accepted
Date: 2026-08-09
Scope: design

**Decision**

DecorStreams use their original seeded 22–42 character range without an additional screen-center length
boost. Terrain anchors, depth groups, the 8/4/2 blur ramp, half-speed falling rows, and the fast local packet
remain unchanged.

**Reason**

The center-weighted length increase made the columns taller than desired after packet visibility was corrected.

**Consequences**

Stream height is once again determined only by the original seeded character count and glyph height.

**Supersedes**

D-015 for stream-length tuning only. D-015 continues to govern the 8/4/2 blur ramp.

### D-018: Stream and packet speeds are independently tunable

Status: accepted
Date: 2026-08-09
Scope: design, animation, workflow

**Decision**

DecorStreams expose separate minimum/maximum speed ranges for falling character rows and for the local
brightness packet. Development controls can tune both ranges live and the existing Save Config action writes
the accepted values back to `config/scene/decorStreams.ts`.

**Reason**

The column motion and the packet serve different visual roles and must not share timing. Independent controls
allow the slow ambient fall and fast travelling highlight to be tuned without shader edits.

**Consequences**

Both animation speeds are shader uniforms sourced from scene controls. New speed tuning should use the Decor
Streams control group rather than hardcoded GLSL constants.

### D-019: Decorative stream height is biased toward screen center

Status: accepted
Date: 2026-08-09
Scope: design

**Decision**

DecorStream glyph counts use a center-height bias of 0.55. The bias scales projected center streams upward
and edge streams downward around the original average height instead of increasing every column uniformly.

**Reason**

The composition needs a stronger central height silhouette while retaining the shorter overall stream range
restored by D-017.

**Consequences**

Changing `centerHeightBias` adjusts the contrast between center and edge columns. A value of zero restores the
unbiased seeded height distribution.

### D-020: Letter-swap speed is independently tunable and reduced

Status: accepted
Date: 2026-08-09
Scope: design, animation, workflow

**Decision**

DecorStreams expose a separate minimum/maximum rate for character replacement, initially set to 1-3 swaps
per second. The development control updates the shader live and Save Config persists the selected range.

**Reason**

Glyph replacement was visually faster than the surrounding stream and packet motion. Its previous effective
rate was approximately 2-6 swaps per second and could only be changed inside the shader.

**Consequences**

Letter swapping can now be slowed or accelerated without changing falling-row speed or packet travel speed.

### D-021: Projects use one archive and link directly to source

Status: accepted
Date: 2026-08-09
Scope: product, design, content

**Decision**

`/projects` is the complete project archive. It presents every project as a concise card, and each card links
directly to the corresponding GitHub repository. The site does not maintain individual project routes until
a project has enough original material for a substantive case study.

**Reason**

The existing detail routes repeated the card image, summary, and technology stack without adding meaningful
context. A direct source link is more useful and honest for the current amount of project writing.

**Consequences**

Project records require a repository URL. The homepage may show a compact selection, while `/projects` owns
the complete list. Add a project detail route only when it can support a real case study with decisions,
outcomes, and supporting media.

### D-022: Preloader animation owns the startup frame budget

Status: accepted
Date: 2026-08-10
Scope: architecture, performance

**Decision**

While the homepage preloader is visible, its frame responsiveness takes priority over total scene startup
speed. Terrain transfer, decompression, contour extraction, smoothing, and geometry-buffer construction run
in a worker. Main-thread scene attachment and GPU warm-up are split across healthy animation frames, and the
heavy scene bundle is not evaluated until the lightweight loader has painted.

**Reason**

The travelling SVG contour requires painting on the main thread. Starting all terrain preparation and WebGL
initialization after only two frames allowed that work to monopolize the same thread and visibly stall the
loader. Network priority alone cannot protect animation frame time from CPU and GPU initialization work.

**Consequences**

Future startup work must remain cancellable, staged, and outside the loader's frame budget. The loader's
visual design and genuine-readiness behavior from D-010 remain unchanged; slower total loading is acceptable
when it preserves responsive animation.
