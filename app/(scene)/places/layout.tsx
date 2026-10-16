// Places routes layout: mounts the persistent PlacesSection and loads its stylesheets.
import type {ReactNode} from 'react';
import {PlacesSection} from '@/components/places/PlacesSection';
import '@/components/places/Places.css';
import '@/components/places/PhotoViewer.css';

export default function PlacesLayout({children}: {children: ReactNode}) {
  return (
    <>
      <PlacesSection />
      {children}
    </>
  );
}
