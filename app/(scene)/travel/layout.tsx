// Travel routes layout: mounts the persistent TravelSection and loads its stylesheets.
import type {ReactNode} from 'react';
import {TravelSection} from '@/components/travel/TravelSection';
import '@/components/travel/Travel.css';
import '@/components/travel/PhotoViewer.css';

export default function TravelLayout({children}: {children: ReactNode}) {
  return (
    <>
      <TravelSection />
      {children}
    </>
  );
}
