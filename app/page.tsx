'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArtworkCards } from '@/components/home/ArtworkCards';
import { ExperienceRoute } from '@/components/home/ExperienceRoute';
import { FlatContourField } from '@/components/home/FlatContourField';
import type { ScrollExperienceRefs } from '@/components/scene/ScrollSceneController';
import { TopNav } from '@/components/TopNav';
import { useHomeState } from '@/components/useHomeState';
import { EXPERIENCE_ROUTE_POINTS } from '@/config/homeScroll';
import { TERRAIN_CONFIG } from '@/config/terrain';

const TerrainBackground = dynamic(
  () => import('@/components/scene/TerrainBackground').then((module) => module.TerrainBackground),
  { ssr: false },
);

export default function Home() {
  const { activeSection, toggleSection } = useHomeState();
  const washRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<HTMLDivElement>(null);
  const routePathRef = useRef<SVGPathElement>(null);
  const splitLayerRef = useRef<HTMLDivElement>(null);
  const splitTopRef = useRef<HTMLDivElement>(null);
  const splitBottomRef = useRef<HTMLDivElement>(null);
  const splitContoursRef = useRef<SVGGElement>(null);
  const transitionCardsRef = useRef<HTMLDivElement>(null);
  const [terrainReady, setTerrainReady] = useState(false);
  const [washed, setWashed] = useState(false);

  const scrollRefs = useMemo<ScrollExperienceRefs>(() => ({
    routeLayer: routeLayerRef,
    routePath: routePathRef,
    splitLayer: splitLayerRef,
    splitTop: splitTopRef,
    splitBottom: splitBottomRef,
    splitContours: splitContoursRef,
    transitionCards: transitionCardsRef,
  }), []);

  useEffect(() => {
    window.scrollTo(0, 0);
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setTerrainReady(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  const mapNarrativeSvh =
    TERRAIN_CONFIG.descent.scrollSvh
    + TERRAIN_CONFIG.descent.mapHoldSvh
    + TERRAIN_CONFIG.descent.washSvh
    + TERRAIN_CONFIG.descent.projectSvh
    - 100;

  return (
    <div className="relative w-full overflow-clip bg-background text-foreground">
      {terrainReady ? (
        <TerrainBackground
          paused={washed}
          washRef={washRef}
          onWashedChange={setWashed}
          domRefs={scrollRefs}
        />
      ) : null}

      <div
        ref={washRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10 bg-background"
        style={{ opacity: 0 }}
      />

      <TopNav activeSection={activeSection} onSectionClick={toggleSection} />

      <main className="pointer-events-none relative z-20">
        <section id="territory" aria-label="Territory" className="h-svh" />

        <section
          id="map"
          aria-labelledby="experience-heading"
          style={{ height: `${mapNarrativeSvh}svh` }}
        >
          <div className="sticky top-0 h-svh overflow-hidden">
            <ExperienceRoute layerRef={routeLayerRef} pathRef={routePathRef} />

            <div
              ref={splitLayerRef}
              className="pointer-events-none absolute inset-0 z-30 opacity-0"
            >
              <FlatContourField
                topRef={splitTopRef}
                bottomRef={splitBottomRef}
                contoursRef={splitContoursRef}
              />

              <div
                ref={transitionCardsRef}
                id="projects"
                aria-labelledby="artwork-heading"
                className="absolute inset-0 opacity-0"
              >
                <div className="absolute left-1/2 top-[23%] flex w-[min(1120px,88vw)] -translate-x-1/2 items-end justify-between border-b border-line pb-3 font-mono uppercase md:top-[29%]">
                  <div>
                    <p className="mb-1 text-[8px] tracking-[0.24em] text-dim">02 · Diagram</p>
                    <h2 id="artwork-heading" className="text-[10px] tracking-[0.2em] text-muted md:text-[11px]">
                      Selected artwork
                    </h2>
                  </div>
                  <span className="hidden text-[8px] tracking-[0.16em] text-dim sm:block">
                    blank plates · content forthcoming
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center px-4 md:px-8">
                  <ArtworkCards />
                </div>
              </div>
            </div>

            <div className="sr-only">
              <h2 id="experience-heading">Experience timeline</h2>
              <ol>
                {EXPERIENCE_ROUTE_POINTS.map((point) => (
                  <li key={point.year}>{point.year}: {point.label}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          id="finale"
          aria-labelledby="finale-heading"
          className="pointer-events-auto relative flex min-h-[112svh] flex-col bg-background"
        >
          <div className="flex min-h-svh flex-1 items-center justify-center px-6 py-24">
            <div className="relative w-[min(570px,82vw)]">
              <h2 id="finale-heading" className="sr-only">End of the trail</h2>
              <Image
                src="/images/frog_dotfield.png"
                alt="A frog emerging from a field of warm dots"
                width={960}
                height={720}
                className="h-auto w-full opacity-90"
                priority={false}
              />
              <p className="mt-5 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-dim">
                End of the trail · for now
              </p>
            </div>
          </div>

          <footer className="mx-auto flex w-[calc(100%_-_40px)] max-w-[1120px] flex-col gap-5 border-t border-line py-7 font-mono text-[9px] uppercase tracking-[0.16em] text-dim sm:flex-row sm:items-center sm:justify-between">
            <p>Solaris · Sophon · 2026</p>
            <nav aria-label="Footer navigation" className="flex gap-5">
              <a href="/about" className="transition-colors hover:text-accent focus-visible:text-accent">About</a>
              <a href="mailto:hello@example.com" className="transition-colors hover:text-accent focus-visible:text-accent">Contact</a>
              <a href="/rss.xml" className="transition-colors hover:text-accent focus-visible:text-accent">RSS</a>
            </nav>
          </footer>
        </section>
      </main>
    </div>
  );
}
