# Project guidance

## Purpose

This repository is a personal website: an atmospheric homepage leading into a clear portfolio, writing space, art archive, travel archive, and about page.

The homepage may be immersive. Section and detail pages must remain readable, fast, mobile-friendly, accessible, and indexable.

## Sources of truth

Use the narrowest applicable source, in this order:

1. The user's current prompt.
2. Accepted decisions in `docs/decisions.md`.
3. Product intent in `docs/product/vision.md`.
4. Design direction in `docs/design/homepage.md`.
5. Architecture in `docs/architecture.md`.
6. Existing implementation, when it does not conflict with the sources above.

Read `docs` before material product, design, or architecture work. Do not treat items marked `exploring` as requirements.

## Working with uncertainty

- Identify design work as exploration, decision, implementation, or verification.
- During exploration, keep unrelated variables constant and prefer two or three concrete variants using representative content.
- Keep experiments isolated. Do not rewrite global tokens or architecture merely to test a possibility.
- Record tentative ideas in `docs/design/hypotheses.md`.
- Promote an idea to `docs/decisions.md` only after the user accepts it or implementation evidence makes it durable.
- Do not turn a one-off preference into a permanent rule without confirmation.

## Architecture principles

- Use semantic HTML for content and navigation. WebGL is an enhancement, not the sole representation of information.
- Keep styling unified. Use existing tailwind css classes whenever possible or design reusable theme tokens, avoid hardcoded magic numbers for font-sizes, padding and margin, etc.
- Use Server Components by default. Add Client Component boundaries only where interaction or browser APIs require them.
- Keep the heavy terrain experience primarily on the homepage. Reading and detail pages should be content-first.
- Keep UI in HTML/SVG and terrain rendering in WebGL; shared state may connect them.
- Design mobile as its own composition rather than shrinking the desktop terrain layout.
- Provide usable reduced-motion and WebGL-unavailable behavior.
- Scope full-screen and `overflow: hidden` behavior to immersive surfaces; normal content pages must scroll.

## Repository map

- `app/`: routes, layouts, global styles, and route handlers.
- `components/`: React UI, scene, effects, and development controls.
- `config/`: tuned runtime configuration.
- `data/`: structured site data.
- `lib/`: terrain, text, and shared implementation logic.
- `shaders/`: GLSL shader sources.
- `public/`: fonts, textures, and other static assets.
- `docs/`: canonical product, design, architecture, and decision knowledge.
- `.claude/`: Claude-specific local configuration only; not a source of project knowledge.
- `.agents/`: legacy raw analysis artifacts pending classification; not a source of project guidance.

## Verification

Before declaring implementation work complete:

- Run lint and the production build when relevant
- Distinguish code failures from environmental failures such as unavailable font or package networks.
- Inspect relevant pages using Firefox or Edge at approximately 390 px, 768 px, and 1440 px widths.
- Check keyboard navigation, focus visibility, touch targets, and reduced-motion behavior for interactive changes.
- Review the final diff for unrelated edits, stale experiments, and accidental debug UI.
- Summarize what was verified and what remains uncertain.

## Change discipline

- Preserve unrelated user changes.
- Do not over-engineer or pre-optimise, prefer simple code patterns
- Prefer small vertical slices that can be visually and technically verified.
- Use real or representative content when evaluating typography and editorial layouts.
- Avoid adding a CMS, database, animation framework, analytics service, or other long-lived dependency without first explaining the need and tradeoffs.
- Do not duplicate canonical guidance across multiple files; link to it instead.
