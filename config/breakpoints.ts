/** Mirrors Tailwind's built-in responsive breakpoints for JavaScript layout decisions. */
export const VIEWPORT_BREAKPOINTS = {
  md: 768,
} as const;

export const VIEWPORT_MEDIA = {
  belowMd: '(width < 48rem)',
} as const;
