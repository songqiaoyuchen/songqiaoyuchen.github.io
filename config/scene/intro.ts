// The homepage intro (components/home/preloader/IntroInk.tsx), in two stages once the scene is ready: a contour map
// accretes outward from the mark's rings until it fills the screen; then, the map held, every line widens into a
// band that is see-through to the scene, until the bands meet and the cover is gone, the terrain's wave setting
// off as it lifts (IntroReveal; the wave is tuned in Contour Lines › Reveal). Leva's Intro folder; seconds unless
// noted.
export const INTRO_CONFIG = {
  lineSpacing: 26, // CSS px between the map's contour lines
  mapRelief: 1, // how much the map's own landforms bend and break the mark's shape (0: concentric offsets)
  mapSeconds: 1, // the map draws outward over this long, however many lines it has
  mapHold: 0.5, // the map held complete, before the lines widen
  revealSeconds: 0.6, // the lines widen until the bands meet over this long
  fadeSeconds: 0.3, // the last of the cover lifting once the bands have met (the terrain's wave sets off then)
} as const;

export type IntroSettings = {[Key in keyof typeof INTRO_CONFIG]: number};
