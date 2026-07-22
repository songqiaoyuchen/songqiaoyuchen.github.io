# Design and art preferences

Status: evolving  
Last reviewed: 2026-07-20

This file articulates the taste behind the design decisions: what the reference sites actually demonstrate, which qualities are being pursued, and which are being rejected. Accepted rules live in `../decisions.md`; unresolved directions live in `hypotheses.md`.

## 1. Reference analysis

### wodniack.dev — animation as micro-craft

What it does:

- two-color palette (#f40c3f on #160000), typography-led single page
- scroll-driven but the visitor keeps control; no scrolljacking, no mandatory sequences
- personality expressed through systematic micro-details: project index IDs (`#3vva-0000/34`), binary motifs, a personal timeline of desk setups since 2006
- animation attached to content as small precise touches, never a takeover

Take: interest-density per scroll pixel; catalog-style metadata as personality; restraint in palette.  
Leave: nothing significant — this is the closest register to the target.

### romanjeanelie.com — a governing metaphor

What it does:

- one committed fiction (theatre) rooted in the author's real biography (cinema → theatre → code)
- identity expressed through staging, light, and narrative timeline rather than through effects
- cohesion comes from the metaphor, so every visual choice has a reason

Take: a single personally-rooted metaphor as the source of cohesion.  
Leave: full-screen desktop-only immersion; weak mobile story.

### rainmorime.com — committed fiction, readable content

What it does:

- a system/OS-diagnostic fiction (status monitor, system log, bio-signal header, corrupted-data glyphs) executed with total commitment
- many small ambient animations; strong, consistent theme
- underneath the fiction, content remains fully readable and content-driven

Take: a diegetic interface can work when the fiction is quiet, cohesive, and subordinate to content.  
Leave: the oversized left avatar panel — identity chrome must not eat layout space.

### blog.elmo.sg / jovantanyk.dev — content needs no invention

What they do:

- conventional Astro/Hugo layouts: cards, dates, tags, categories, reading time
- scannable, metadata-rich, zero friction between visitor and text

Take: content presentation should be this conventional. Identity belongs in the frame around it.  
Leave: the genericness — typography, color, and line work must still carry the site's identity.

### lusion.co/about — negative reference (was the homepage inspiration)

What it does:

- dark cinematic scroll-narrative, WebGL-dominant, "scroll to explore" pacing
- atmospheric, but in a commercial promo-site register; the animation is the product

Take: ambient atmosphere — darkness, light, grain, depth, stillness.  
Leave: performed atmosphere — camera flights, scroll-narrative pacing, choreographed reveals. Heavy 3D immersion reads as dated corporate showcase, not personal site.

## 2. Preference axes

1. **Identity through a governing metaphor, not through effects.** Every admired reference commits to one fiction rooted in the author's biography. The native metaphor here is terrain / routes / expedition. The terrain subject is right; the register it is executed in is what needs care.

2. **The anti-goal is noise, not fiction.** The "no fake OS / no sci-fi HUD" rule is really about three failures: incoherence (borrowed aesthetics with no personal root), clutter (glitch spam, diagnostics-as-decoration), and content obstruction. A committed, quiet, personally-rooted diegetic frame — as on rainmorime — is admissible.

3. **Craft lives in small details, not big systems.** Many precise micro-interactions (hover responses, line draws, index numbers, tick marks) beat one cinematic camera system. The visitor always keeps control of scroll and navigation.

4. **Content is load-bearing; the theme is a frame.** Actual content uses conventional editorial layouts (see D-001). Identity carries into deep pages through typography, color, and line work — never through the full terrain experience.

5. **Atmosphere is ambient, not performed.** Keep darkness, light, grain, depth, stillness. Drop camera flights, mandatory sequences, promo choreography. This is the precise correction away from the Lusion register.

6. **Restraint as a signature.** Near-monochrome palette with one warm accent; typography as the primary identity carrier; WebGL as material, not subject (see D-003).

7. **Identity chrome stays compact.** Avatar/hero panels must not dominate the layout — the named flaw of the otherwise-admired rainmorime.

## 3. Tensions and implications

- **The console vocabulary.** Current doc language — "Terrain *Console*", "*holographic* panel", "nav *rays*" — pulls toward the HUD register axes 2 and 5 warn against. The references pull toward a cartography / field-journal register (surveyor's map, expedition notes), which also fits the Travel and Writing content. Tracked as H-005 in `hypotheses.md`.
- **Trend alignment.** The move away from heavy immersive 3D toward editorial, typography-led design with selective WebGL accents matches where award-site design has gone since ~2024; the instinct to correct away from Lusion is not just taste but timing.
