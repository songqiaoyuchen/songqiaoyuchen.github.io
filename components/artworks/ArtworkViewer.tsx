'use client';

import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import type {Artwork} from '@/data/artworks';

interface ArtworkViewerProps {
  artwork: Artwork;
  priority: boolean;
}

export function ArtworkViewer({artwork, priority}: ArtworkViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeViewer() {
    setIsOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeViewer();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={`Open ${artwork.title}. ${artwork.material}. ${artwork.size}. ${artwork.description}`}
        className="group relative block w-full cursor-zoom-in overflow-hidden border border-line bg-panel p-0
          text-left focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-accent"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Image
          alt={artwork.alt}
          className="block h-auto w-full transition duration-300 ease-out group-hover:brightness-75
            motion-reduce:transition-none"
          height={artwork.height}
          priority={priority}
          sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) calc(50vw - 44px), 410px"
          src={artwork.src}
          width={artwork.width}
        />
        <span
          className={`pointer-events-none absolute inset-0 flex flex-col justify-end bg-linear-to-t
            from-black/90 via-black/20 to-transparent p-5 opacity-0 transition-opacity duration-300
            motion-reduce:transition-none sm:p-6 ${isOpen
              ? 'opacity-0'
              : 'group-hover:opacity-100'}`}
        >
          <span className="font-mono text-micro uppercase tracking-label text-accent-soft">
            {artwork.material} <span className="text-dim" aria-hidden="true">/</span> {artwork.size}
          </span>
          <span className="mt-2 font-serif text-2xl font-normal italic leading-tight text-text">
            {artwork.title}
          </span>
          <span className="mt-3 max-w-copy font-mono text-copy leading-copy text-muted">
            {artwork.description}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-60 grid place-items-center p-4 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
            onClick={closeViewer}
          />

          <section
            aria-describedby={`${artwork.id}-description`}
            aria-labelledby={`${artwork.id}-title`}
            aria-modal="true"
            className="relative z-10 grid max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto
              border border-line bg-panel p-4 shadow-2xl shadow-black/60 sm:max-h-[calc(100svh-4rem)]
              sm:w-fit sm:max-w-[calc(100vw-4rem)] sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6 sm:p-6
              sm:pr-14"
            role="dialog"
          >
            <button
              aria-label="Close viewer"
              className="absolute right-2 top-2 z-10 grid size-11 place-items-center border-0 bg-panel/90
                p-0 font-mono text-xl text-muted transition-colors hover:text-text
                focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={closeViewer}
              type="button"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          
            <div className="grid min-h-0 place-items-center bg-black/20 sm:justify-self-start">
              <Image
                alt={artwork.alt}
                className="h-auto max-h-[68svh] w-auto max-w-full object-contain sm:max-w-208"
                height={artwork.height}
                sizes="(max-width: 639px) calc(100vw - 64px), (max-width: 1023px) calc(100vw - 96px), 900px"
                src={artwork.src}
                width={artwork.width}
              />
            </div>

            <div className="pt-5 sm:flex sm:flex-col sm:justify-end sm:py-2">
              <p className="m-0 font-mono text-micro uppercase tracking-label text-accent-soft">
                {artwork.material} <span className="text-dim" aria-hidden="true">/</span> {artwork.size}
              </p>
              <h2
                className="mb-0 mt-3 font-serif text-3xl font-normal italic leading-tight text-text"
                id={`${artwork.id}-title`}
              >
                {artwork.title}
              </h2>
              <p
                className="mb-0 mt-4 max-w-copy font-mono text-copy leading-copy text-muted"
                id={`${artwork.id}-description`}
              >
                {artwork.description}
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
