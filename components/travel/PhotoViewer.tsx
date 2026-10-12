// A gallery's photo at full size with its text (/travel/[trip]?gallery=<id>&photo=<index>): a modal dialog with
// previous/next and a return to the trip, after Art's inspection dialog.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useModalDialog} from '@/components/art/inspection/useModalDialog';
import type {Gallery, GalleryPhoto} from '@/data/travel';

type PhotoViewerProps = {
  gallery: Gallery;
  photos: readonly GalleryPhoto[];
  index: number;
  tripHref: string;
  onClose: () => void;
};

export function PhotoViewer({gallery, photos, index, tripHref, onClose}: PhotoViewerProps) {
  const {dialogRef, closeRef, trapFocus} = useModalDialog();
  const photo = photos[index];
  if (!photo) return null;
  const href = (at: number) => `${tripHref}?gallery=${gallery.id}&photo=${at}`;
  const previous = index > 0 ? index - 1 : null;
  const next = index < photos.length - 1 ? index + 1 : null;

  return (
    <dialog
      aria-label={`${gallery.title}: photo ${index + 1} of ${photos.length}`}
      className="travel-viewer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={trapFocus}
      open
      ref={dialogRef}
    >
      <div className="travel-viewer-toolbar">
        <span className="travel-viewer-count">{gallery.title} · {index + 1} / {photos.length}</span>
        <a
          aria-label="Close photo and return to the trip"
          className="travel-link"
          href={tripHref}
          onClick={(event) => {
            event.preventDefault();
            onClose();
          }}
          ref={closeRef}
        >
          Back to trip <span aria-hidden="true">×</span>
        </a>
      </div>
      <div className="travel-viewer-image">
        <Image
          alt={photo.text || `${gallery.title}, photo ${index + 1}`}
          height={photo.height}
          priority
          sizes="(max-width: 767px) 94vw, 86vw"
          src={photo.src}
          width={photo.width}
        />
      </div>
      <div className="travel-viewer-nav">
        {previous !== null ? (
          <Link className="travel-link" href={href(previous)} replace scroll={false}>
            <span aria-hidden="true">←</span> Previous
          </Link>
        ) : <span />}
        <p className="travel-viewer-caption">{photo.text}</p>
        {next !== null ? (
          <Link className="travel-link" href={href(next)} replace scroll={false}>
            Next <span aria-hidden="true">→</span>
          </Link>
        ) : <span />}
      </div>
    </dialog>
  );
}
