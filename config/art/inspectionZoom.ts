// Inspection zoom on desktops (components/art/inspection/useInspectionZoom.ts), shared by inspected artworks and
// inspected Places photos.
export const INSPECTION_ZOOM_CONFIG = {
  // Snappier than the carousel: the image answers each wheel step at once and settles without bouncing.
  spring: {stiffness: 420, damping: 42, restDelta: 0.0005, restSpeed: 0.01},
  // Zoom per pixel of wheel travel (e^-delta·rate): a mouse wheel or two-finger scroll, and a trackpad pinch, whose
  // deltas are smaller.
  wheelRate: 0.0022,
  pinchRate: 0.012,
  // Double-click's zoom, about the point clicked; + and - zoom by keyStep about the middle.
  doubleClick: 2.5,
  keyStep: 1.5,
  // The deepest zoom shows the image's own pixels at one CSS pixel each, but never less than this.
  maxAtLeast: 2,
} as const;
