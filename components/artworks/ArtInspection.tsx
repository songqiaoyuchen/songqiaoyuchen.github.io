'use client';

import Image from 'next/image';
import {useEffect, useRef, useState} from 'react';
import type {Artwork} from '@/data/artworks';

export function ArtInspection({
  artwork,
  collectionHref,
  onClose,
}: {
  artwork: Artwork;
  collectionHref: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLAnchorElement>(null);
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.close();
    element.showModal();
    close.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <dialog
      open
      ref={dialog}
      className="art-inspection"
      aria-labelledby="inspection-title"
      aria-describedby="inspection-description"
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button')];
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="art-inspection-toolbar">
        <span className="art-eyebrow">A closer look</span>
        <a
          ref={close}
          className="art-text-link"
          href={collectionHref}
          onClick={(event) => {
            event.preventDefault();
            onClose();
          }}
          aria-label="Close artwork and return to collection"
        >
          Back to collection <span aria-hidden="true">×</span>
        </a>
      </div>
      <div className="art-inspection-image">
        <noscript>
          <style>{`
          .art-image-status, .art-section, body > nav { display: none; }
          .art-inspection { animation: none !important; }
        `}</style>
        </noscript>
        {imageState === 'loading' && (
          <p className="art-image-status" role="status">
            Loading artwork…
          </p>
        )}
        {imageState === 'failed' && (
          <p className="art-image-status" role="status">
            The image could not load. <a href={artwork.src}>Open the original image</a>
          </p>
        )}
        <Image
          alt={artwork.alt}
          src={artwork.src}
          width={artwork.width}
          height={artwork.height}
          sizes="(max-width: 767px) 94vw, 86vw"
          priority
          onLoad={() => setImageState('ready')}
          onError={() => setImageState('failed')}
        />
      </div>
      <div className="art-inspection-caption">
        <div>
          <h2 id="inspection-title">{artwork.title}</h2>
          <p className="art-eyebrow">
            {artwork.material} · {artwork.size}
          </p>
        </div>
        <p id="inspection-description">{artwork.description || artwork.alt}</p>
      </div>
    </dialog>
  );
}
