'use client';

import Image from 'next/image';
import {useRef, useState} from 'react';
import type {Artwork} from '@/data/artworks';
import {ArtworkLightbox} from './ArtworkLightbox';

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
          <span className="shrink-0 font-mono text-micro uppercase tracking-label text-accent-soft">
            {artwork.material} <span className="text-dim" aria-hidden="true">/</span> {artwork.size}
          </span>
          <span className="mt-2 shrink-0 font-serif text-2xl font-normal italic leading-tight text-text">
            {artwork.title}
          </span>
          <span className="mt-3 line-clamp-2 max-w-copy font-mono text-copy leading-copy text-muted">
            {artwork.description}
          </span>
        </span>
      </button>

      {isOpen && <ArtworkLightbox artwork={artwork} onClose={closeViewer} />}
    </>
  );
}
