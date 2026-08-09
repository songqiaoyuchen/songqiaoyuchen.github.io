'use client';

import Image from 'next/image';
import {createPortal} from 'react-dom';
import {useEffect} from 'react';
import type {Artwork} from '@/data/artworks';

interface ArtworkLightboxProps {
  artwork: Artwork;
  onClose: () => void;
}

export function ArtworkLightbox({artwork, onClose}: ArtworkLightboxProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-60 grid place-items-center p-4 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
        onClick={onClose}
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
          className="absolute right-2 top-2 z-10 grid size-11 place-items-center border-0 bg-transparent
            p-0 font-mono text-xl text-muted transition-colors hover:text-text sm:bg-panel/90
            focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={onClose}
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
    </div>,
    document.body,
  );
}
