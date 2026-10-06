// Choreography of the Selected <-> All works transition (components/art/transition/useGalleryTransition.ts).
// Phases are shares of the whole duration: works leave until `depart`, rest on the table, rise after `rest`.
export const GALLERY_TRANSITION_CONFIG = {
  durationMs: 1120,
  steps: 64, // keyframes sampled per animation
  depart: 0.42,
  rest: 0.52,
  stagger: 0.22, // share of each phase spread across carousel works, most prominent first
  table: 'rotateX(56deg) rotateZ(-45deg)', // the tilted plane works rest on
  departCurve: [0.55, 0, 0.3, 1] as const,
  arriveCurve: [0.4, 0, 0.16, 1] as const,
} as const;
