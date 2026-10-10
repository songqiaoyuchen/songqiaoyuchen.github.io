// A trip's photo at full size (/travel/[trip]?photo=<index>): a modal dialog with previous/next and a return to
// the trip, after Art's inspection dialog.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useModalDialog} from '@/components/art/inspection/useModalDialog';
import type {Trip} from '@/data/travel';

type PhotoViewerProps = {
  trip: Trip;
  index: number;
  tripHref: string;
  onClose: () => void;
};

export function PhotoViewer({trip, index, tripHref, onClose}: PhotoViewerProps) {
  const {dialogRef, closeRef, trapFocus} = useModalDialog();
  const photos = trip.photos ?? [];
  const photo = photos[index];
  if (!photo) return null;
  const previous = index > 0 ? index - 1 : null;
  const next = index < photos.length - 1 ? index + 1 : null;

  return (
    <dialog
      aria-label={`${trip.title}: photo ${index + 1} of ${photos.length}`}
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
        <span className="travel-viewer-count">{index + 1} / {photos.length}</span>
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
          alt={photo.alt}
          height={photo.height}
          priority
          sizes="(max-width: 767px) 94vw, 86vw"
          src={photo.src}
          width={photo.width}
        />
      </div>
      <div className="travel-viewer-nav">
        {previous !== null ? (
          <Link className="travel-link" href={`${tripHref}?photo=${previous}`} replace scroll={false}>
            <span aria-hidden="true">←</span> Previous
          </Link>
        ) : <span />}
        <p className="travel-viewer-caption">{photo.alt}</p>
        {next !== null ? (
          <Link className="travel-link" href={`${tripHref}?photo=${next}`} replace scroll={false}>
            Next <span aria-hidden="true">→</span>
          </Link>
        ) : <span />}
      </div>
    </dialog>
  );
}
