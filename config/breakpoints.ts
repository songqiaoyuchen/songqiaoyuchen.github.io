// Viewport breakpoints and media queries shared by JavaScript layout decisions.
/** Mirrors Tailwind's built-in responsive breakpoints for JavaScript layout decisions. */
export const VIEWPORT_BREAKPOINTS = {
  md: 768,
  // Places' sheet layout ends here (not a Tailwind step): iPads in either orientation take the sheet, laptop
  // windows from here up the panel beside the globe.
  placesSheet: 1152,
} as const;

export const VIEWPORT_MEDIA = {
  belowMd: '(width < 48rem)',
  // Places' sheet layout (the globe above, the text in a sheet below) reaches up to here: its desktop panel
  // beside the close-framed globe needs a wide page, so tablets take the sheet (Places.css, PlacesCallouts.css,
  // useLocationSheetPlacement.ts write it out).
  belowPlacesSheet: '(width < 72rem)',
  // Narrow or touch layouts: the Art carousel turns vertical (matches the art CSS).
  touchOrNarrow: '(max-width: 767px), (pointer: coarse)',
} as const;
