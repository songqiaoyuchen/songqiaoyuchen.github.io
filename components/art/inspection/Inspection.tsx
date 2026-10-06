// Inspected artwork (/artworks/[id]): full-screen dialog with the large image and its wall label.
// Escape or "Back to collection" returns to the view it was opened from (Inspection.css).
'use client';

import Image from 'next/image';
import {useState} from 'react';
import type {Artwork} from '@/data/artworks';
import {WallLabel} from '../label/WallLabel';
import {useModalDialog} from './useModalDialog';

export function Inspection({
  artwork,
  collectionHref,
  onClose,
}: {
  artwork: Artwork;
  collectionHref: string;
  onClose: () => void;
}) {
  const {dialogRef, closeRef, trapFocus} = useModalDialog();
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'failed'>('loading');

  return (
    <dialog
      open
      ref={dialogRef}
      className="art-inspection"
      aria-labelledby="inspection-title"
      aria-describedby="inspection-description"
      onKeyDown={trapFocus}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="art-inspection-toolbar">
        <a
          ref={closeRef}
          className="art-text-link ml-auto"
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
        {/* Without JavaScript the dialog is the whole page. */}
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
      <WallLabel artwork={artwork} className="art-inspection-caption" description="alt"
        titleId="inspection-title" descriptionId="inspection-description" />
    </dialog>
  );
}
