// The letter in the bottle: loose paper sheets over the crack (or over the overview, reopened later), read one at a
// time off the top of the stack. Plain HTML, so it reads without WebGL. Arrows, a swipe, or a tap on the sheet turn
// it (a tap on its left third goes back); Escape or the close button closes it.
'use client';

import Image from 'next/image';
import {useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent} from 'react';
import {LAKE_LETTER} from '@/data/lake';

type LakeLetterProps = {
  open: boolean;
  /** Closing from the crack surfaces; from the overview it only closes. */
  underwater: boolean;
  onClose: () => void;
};

const PAGES = LAKE_LETTER.pages;
/** Each sheet's tilt in degrees once it lies under the top one, so the stack reads as loose paper. */
const TILTS = [-1.6, 1.2, -0.7, 1.8, -1.3, 0.8];
/** Prints sit a little askew on the page. */
const PRINT_TILTS = [-1.8, 1.4, -1.1];
/** Pointer travel, in px, that turns a swipe into a page turn; below `TAP` it is a tap. */
const SWIPE = 56;
const TAP = 6;
/** Degrees the top sheet leans per px dragged. */
const DRAG_TILT = 0.025;

export function LakeLetter({open, underwater, onClose}: LakeLetterProps) {
  const [page, setPage] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{id: number; x: number; dx: number} | null>(null);
  const last = PAGES.length - 1;

  const turn = useCallback((step: number) => {
    setPage((current) => Math.min(last, Math.max(0, current + step)));
  }, [last]);

  // Every opening starts at the first sheet.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPage(0);
  }

  // A step button that just hid itself at either end hands focus on, so it is not lost to the page.
  useEffect(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.classList.contains('lake-letter-step')) return;
    if (page === last) closeRef.current?.focus();
    else if (page === 0) nextRef.current?.focus();
  }, [last, page]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => (nextRef.current ?? closeRef.current)?.focus(), 400);
    const onKeyDown = (event: KeyboardEvent) => {
      const step = {ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1}[event.key];
      if (event.key === 'Escape') onClose();
      else if (step) turn(step);
      else return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose, open, turn]);

  // The top sheet follows a drag; it lets go to a turn past `SWIPE`, or back into place.
  const setDrag = (dx: number) => {
    stackRef.current?.style.setProperty('--letter-drag', `${dx}px`);
    stackRef.current?.style.setProperty('--letter-drag-tilt', `${dx * DRAG_TILT}deg`);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = {id: event.pointerId, x: event.clientX, dx: 0};
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    current.dx = event.clientX - current.x;
    if (Math.abs(current.dx) < TAP) return;
    const stack = event.currentTarget;
    if (stack.dataset.dragging === undefined) {
      stack.dataset.dragging = '';
      // Capture keeps the drag when the pointer leaves the sheet; a pointer the browser already dropped has none.
      try {
        stack.setPointerCapture(event.pointerId);
      } catch {}
    }
    setDrag(current.dx);
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    setDrag(0);
    if (event.type === 'pointercancel') return;
    if (Math.abs(current.dx) >= SWIPE) {
      turn(current.dx < 0 ? 1 : -1);
    } else if (Math.abs(current.dx) < TAP && !window.getSelection()?.toString()) {
      const bounds = event.currentTarget.getBoundingClientRect();
      turn(event.clientX - bounds.left < bounds.width / 3 ? -1 : 1);
    }
  };

  return (
    <div className="lake-letter" data-open={open || undefined} aria-hidden={!open} inert={!open}>
      <div className="lake-letter-panel" role="dialog" aria-modal="true" aria-labelledby="lake-letter-title">
        <p className="lake-letter-eyebrow">Found at the bottom</p>
        <h2 className="sr-only" id="lake-letter-title">{LAKE_LETTER.title}</h2>
        <div
          ref={stackRef}
          className="lake-letter-stack"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {PAGES.map((sheet, index) => {
            const place = index < page ? 'read' : index === page ? 'top' : index - page > 2 ? 'deep' : 'under';
            const style = {
              '--depth': index - page,
              '--tilt': `${TILTS[index % TILTS.length]}deg`,
              zIndex: place === 'read' ? PAGES.length + index : PAGES.length - index,
            } as CSSProperties;
            return (
              <section
                className="lake-letter-sheet"
                data-place={place}
                style={style}
                aria-label={`Page ${index + 1} of ${PAGES.length}`}
                aria-hidden={place !== 'top'}
                inert={place !== 'top'}
                key={index}
              >
                {sheet.heading ? <p className="lake-letter-heading">{sheet.heading}</p> : null}
                {sheet.photo ? (
                  <figure
                    className="lake-letter-print"
                    style={{'--print-tilt': `${PRINT_TILTS[index % PRINT_TILTS.length]}deg`} as CSSProperties}
                  >
                    <div className="lake-letter-photo">
                      {sheet.photo.image ? (
                        <Image
                          src={sheet.photo.image}
                          alt={sheet.photo.alt}
                          fill
                          sizes="(max-width: 480px) 80vw, 22rem"
                        />
                      ) : (
                        <span role="img" aria-label={sheet.photo.alt} />
                      )}
                    </div>
                    <figcaption>{sheet.photo.caption}</figcaption>
                  </figure>
                ) : null}
                {sheet.paragraphs?.map((paragraph) => (
                  <p className="lake-letter-copy" key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
                {sheet.signed ? <p className="lake-letter-signature">{LAKE_LETTER.signature}</p> : null}
              </section>
            );
          })}
        </div>
        <div className="lake-letter-controls">
          <button
            type="button"
            className="lake-letter-step"
            aria-label="Previous page"
            data-hidden={page === 0 || undefined}
            onClick={() => turn(-1)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <p className="lake-letter-count" aria-live="polite">
            <span className="sr-only">Page </span>{page + 1} / {PAGES.length}
          </p>
          <button
            ref={nextRef}
            type="button"
            className="lake-letter-step"
            aria-label="Next page"
            data-hidden={page === last || undefined}
            onClick={() => turn(1)}
          >
            <span aria-hidden="true">→</span>
          </button>
          <button ref={closeRef} type="button" className="lake-letter-close" onClick={onClose}>
            {underwater ? 'Surface' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
