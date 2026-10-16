// A gallery full-page (/places/[location]?gallery=<id>&photo=<index>): a modal dialog holding its photos in one row
// that slides (usePhotoTrack), the current photo large in the middle and its neighbours dim to either side, after Art's
// selected works. Under it the photo's date, place and description, and a ruler with a tick per photo, grouped by day
// (PhotoViewer.css).
'use client';

import Image from 'next/image';
import type {CSSProperties} from 'react';
import {useModalDialog} from '@/components/art/inspection/useModalDialog';
import {PHOTO_VIEWER_CONFIG} from '@/config/places/photoViewer';
import {formatDay, photoAlt, type Gallery, type GalleryPhoto} from '@/data/places';
import {usePhotoTrack} from './usePhotoTrack';

type PhotoViewerProps = {
  gallery: Gallery;
  photos: readonly GalleryPhoto[];
  index: number;
  locationHref: string;
  onClose: () => void;
};

const {measure, lines, slack} = PHOTO_VIEWER_CONFIG.description;

/**
 * The description's measure (ch): the usual one while it fits the caption's lines, else just wide enough to. The
 * font is monospaced, so its width is its length, a wide (CJK) character counting two.
 */
function descriptionMeasure(text: string) {
  let width = 0;
  for (const character of text) width += /[⺀-鿿가-힯豈-﫿＀-￯]/.test(character) ? 2 : 1;
  return Math.max(measure, Math.ceil((width / lines) * slack));
}

export function PhotoViewer({gallery, photos, index, locationHref, onClose}: PhotoViewerProps) {
  const {dialogRef, closeRef, trapFocus} = useModalDialog();
  const {stageRef, shown, select, stageHandlers, handleKey} = usePhotoTrack(photos, index);
  const photo = photos[shown];
  // Consecutive photos of a day: the ruler's groups.
  const days: number[][] = [];
  photos.forEach((item, at) => {
    if (at && item.date === photos[at - 1].date) days[days.length - 1].push(at);
    else days.push([at]);
  });

  return (
    <dialog
      aria-label={`${gallery.title}: photo ${shown + 1} of ${photos.length}`}
      className="places-viewer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (!handleKey(event)) trapFocus(event);
      }}
      open
      ref={dialogRef}
    >
      <div className="places-viewer-toolbar">
        <span className="places-viewer-count">{gallery.title} · {shown + 1} / {photos.length}</span>
        <a
          aria-label="Close the gallery and return to the place"
          className="places-link"
          href={locationHref}
          onClick={(event) => {
            event.preventDefault();
            onClose();
          }}
          ref={closeRef}
        >
          Back to location <span aria-hidden="true">×</span>
        </a>
      </div>
      <div className="places-viewer-track">
        <div className="places-viewer-stage" ref={stageRef} {...stageHandlers}>
          {photos.map((item, at) => (
            <div
              aria-hidden={at !== shown || undefined}
              className="places-viewer-slide"
              data-current={at === shown || undefined}
              key={item.src}
              onClick={() => select(at)}
            >
              <Image
                alt={photoAlt(gallery, item)}
                draggable={false}
                height={item.height}
                loading={Math.abs(at - index) <= 2 ? 'eager' : 'lazy'}
                sizes="(max-width: 767px) 82vw, 62vw"
                src={item.src}
                width={item.width}
              />
            </div>
          ))}
        </div>
        <button
          aria-label="Previous photo"
          className="places-viewer-step"
          data-step="previous"
          disabled={shown === 0}
          onClick={() => select(shown - 1)}
          type="button"
        >
          ←
        </button>
        <button
          aria-label="Next photo"
          className="places-viewer-step"
          data-step="next"
          disabled={shown === photos.length - 1}
          onClick={() => select(shown + 1)}
          type="button"
        >
          →
        </button>
      </div>
      <div
        aria-live="polite"
        className="places-viewer-caption"
        style={{'--places-viewer-description-lines': lines} as CSSProperties}
      >
        <div key={shown}>
          <p className="places-viewer-meta">
            {formatDay(photo.date)} · <span>{photo.location}</span>
          </p>
          {photo.description ? (
            <p
              className="places-viewer-description"
              style={{'--places-viewer-description-measure': `${descriptionMeasure(photo.description)}ch`} as
                CSSProperties}
            >
              {photo.description}
            </p>
          ) : null}
        </div>
      </div>
      <div aria-label="Photos by day" className="places-viewer-ruler" role="group">
        {days.map((day) => (
          <div className="places-viewer-day" key={photos[day[0]].date}>
            {day.map((at) => (
              <button
                aria-current={at === shown || undefined}
                aria-label={`Photo ${at + 1}: ${formatDay(photos[at].date)}, ${photos[at].location}`}
                key={at}
                onClick={() => select(at)}
                type="button"
              />
            ))}
          </div>
        ))}
      </div>
    </dialog>
  );
}
