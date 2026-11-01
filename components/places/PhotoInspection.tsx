// An inspected gallery photo (?gallery=&photo=&inspect=1), opened from the current photo of the viewer, after Art's
// inspected works: a dialog over the viewer with the photo as large as the page allows, without its caption (the viewer
// shows it). On desktops
// the photo zooms (useInspectionZoom) and swaps to its large copy once that has loaded; touch screens keep the
// browser's pinch-zoom. One photo, as Art inspects one work: Escape returns a zoomed photo to fit, else it or "Back to
// gallery" returns to the viewer (PhotoViewer.css).
'use client';

import Image from 'next/image';
import {useRef} from 'react';
import {useFullResolution, useInspectionZoom} from '@/components/art/inspection/useInspectionZoom';
import {useModalDialog} from '@/components/art/inspection/useModalDialog';
import {photoAlt, type Gallery, type GalleryPhoto} from '@/data/places';

type PhotoInspectionProps = {
  gallery: Gallery;
  photos: readonly GalleryPhoto[];
  index: number;
  /** The viewer at this photo, where "Back to gallery" leads. */
  galleryHref: string;
  onClose: () => void;
};

export function PhotoInspection({gallery, photos, index, galleryHref, onClose}: PhotoInspectionProps) {
  const {dialogRef, closeRef, trapFocus} = useModalDialog();
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const photo = photos[index];
  const zoom = useInspectionZoom({
    viewportRef, imageRef, naturalWidth: photo.large?.width ?? photo.width,
  });
  const image = useFullResolution(imageRef, photo.src, photo.large?.src, zoom.enabled);

  return (
    <dialog
      aria-label={`${gallery.title}: photo ${index + 1} of ${photos.length}, inspected`}
      className="places-inspection"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (!zoom.handleKey(event)) trapFocus(event);
      }}
      open
      ref={dialogRef}
    >
      <div className="places-viewer-toolbar">
        <span className="places-viewer-count">{gallery.title} · {index + 1} / {photos.length}</span>
        <a
          aria-label="Close the photo and return to the gallery"
          className="places-link"
          href={galleryHref}
          onClick={(event) => {
            event.preventDefault();
            onClose();
          }}
          ref={closeRef}
        >
          Back to gallery <span aria-hidden="true">×</span>
        </a>
      </div>
      <div className="places-inspection-image" ref={viewportRef} {...zoom.viewportProps}>
        <Image
          alt={photoAlt(gallery, photo)}
          draggable={false}
          height={photo.height}
          priority
          ref={imageRef}
          sizes="(max-width: 767px) 94vw, 90vw"
          src={image.src}
          style={image.style}
          unoptimized={image.full}
          width={photo.width}
        />
      </div>
    </dialog>
  );
}
