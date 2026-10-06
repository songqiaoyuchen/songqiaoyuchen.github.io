// Art routes layout: mounts the persistent ArtSection and loads the art stylesheets.
import type {ReactNode} from 'react';
import {ArtSection} from '@/components/art/ArtSection';
// Import order is cascade order: the section first (shared links, focus rings), then the files
// that override it. Kept as plain imports (no CSS @import index) so Tailwind leaves them untouched.
import '@/components/art/ArtSection.css';
import '@/components/art/ScopeLink.css';
import '@/components/art/selected/Carousel.css';
import '@/components/art/transition/GalleryTransition.css';
import '@/components/art/selected/SwipeRail.css';
import '@/components/art/label/WallLabel.css';
import '@/components/art/selected/Caption.css';
import '@/components/art/all/Collection.css';
import '@/components/art/all/MediumNav.css';
import '@/components/art/inspection/Inspection.css';
import '@/components/art/capture/CapturePanel.css';

export default function ArtLayout({children}: {children: ReactNode}) {
  return (
    <>
      <ArtSection />
      {children}
    </>
  );
}
