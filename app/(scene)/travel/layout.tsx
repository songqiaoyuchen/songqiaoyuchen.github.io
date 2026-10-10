// Travel routes layout: mounts the persistent TravelSection and loads its stylesheet.
import type {ReactNode} from 'react';
import {TravelSection} from '@/components/travel/TravelSection';
import '@/components/travel/Travel.css';

export default function TravelLayout({children}: {children: ReactNode}) {
  return (
    <>
      <TravelSection />
      {children}
    </>
  );
}
