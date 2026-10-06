// Viewport breakpoints and media queries shared by JavaScript layout decisions.
/** Mirrors Tailwind's built-in responsive breakpoints for JavaScript layout decisions. */
export const VIEWPORT_BREAKPOINTS = {
  md: 768,
} as const;

export const VIEWPORT_MEDIA = {
  belowMd: '(width < 48rem)',
  // Narrow or touch layouts: the Art carousel turns vertical (matches the art CSS).
  touchOrNarrow: '(max-width: 767px), (pointer: coarse)',
} as const;
