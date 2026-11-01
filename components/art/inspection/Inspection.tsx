// Inspected artwork (/artworks/[id]): full-screen dialog with the large image and its wall label. On desktops the
// image zooms (useInspectionZoom) and swaps to the original once it has loaded. Escape returns a zoomed image to fit,
// else it or "Back to collection" returns to the view it was opened from (Inspection.css).
'use client';

import Image from 'next/image';
import {useRef, useState} from 'react';
import type {Artwork} from '@/data/artworks';
import {WallLabel} from '../label/WallLabel';
import {useFullResolution, useInspectionZoom} from './useInspectionZoom';
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const zoom = useInspectionZoom({viewportRef, imageRef, naturalWidth: artwork.width});
  // The original, unresized, for a close look.
  const original = imageState === 'ready' ? artwork.src : undefined;
  const image = useFullResolution(imageRef, artwork.src, original, zoom.enabled);

  return (
    <dialog
      open
      ref={dialogRef}
      className="art-inspection"
      aria-labelledby="inspection-title"
      aria-describedby="inspection-description"
      onKeyDown={(event) => {
        if (!zoom.handleKey(event)) trapFocus(event);
      }}
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
      <div className="art-inspection-image" ref={viewportRef} {...zoom.viewportProps}>
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
          src={image.src}
          unoptimized={image.full}
          style={image.style}
          width={artwork.width}
          height={artwork.height}
          sizes="(max-width: 767px) 94vw, 86vw"
          priority
          draggable={false}
          ref={imageRef}
          onLoad={() => setImageState('ready')}
          onError={() => setImageState('failed')}
        />
      </div>
      <WallLabel artwork={artwork} className="art-inspection-caption" description="alt"
        titleId="inspection-title" descriptionId="inspection-description" />
    </dialog>
  );
}
