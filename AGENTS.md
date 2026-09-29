# Project guidance

This repository is a personal website, focused on demonstrating personal taste, identity and space through thoughtful interaction design and micro-animations.

The homepage may be immersive. Textual content must remain readable, fast, mobile-friendly, accessible, and indexable.

## Working here

- Follow the user's current scope and [workflow](docs/workflow.md).
- Consult [architecture](docs/architecture.md) for code ownership and commands; read other docs only when relevant.
- Use the current implementation as context, not a restriction on new directions.
- Preserve unrelated user changes. Keep changes focused and code simple.
- Reuse Tailwind classes, shared tokens, and existing patterns.
- Use Server Components by default; add client boundaries for interaction/browser APIs.
- Keep important content and navigation in semantic HTML; WebGL enhances them.
- Explain the need and tradeoffs before adding a long-lived dependency.
- Track deferred improvements in `docs/todos/`; they are not automatic task scope.
- Keep docs operational and brief. Update architecture when structure changes; do not maintain design histories.
