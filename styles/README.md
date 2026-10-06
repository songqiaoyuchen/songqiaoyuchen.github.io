# styles

Global CSS. Component styles live beside their components; this folder holds what every page shares.

| File | Purpose |
| --- | --- |
| `globals.css` | Entry imported by `app/layout.tsx`: Tailwind, then every global partial in cascade order |
| `tokens.css` | Design tokens: Tailwind theme (palette, type, spacing, animations) and raw tokens (z-order, hit size…) |
| `base.css` | html/body defaults and the page gutter breakpoint |
| `keyframes.css` | Keyframes shared by theme animations |
| `utilities.css` | Generic custom utilities (`no-scrollbar`) |

Translucent colours sit in a token block at the top of the stylesheet that uses them, written as literal
`rgb()` so the minifier bakes them exactly; opaque colours use the palette tokens.
