// The letter in the bottle: a readable panel over the crack (or over the overview, reopened later). Plain HTML, so
// it reads without WebGL; Escape or its one button closes it.
'use client';

import {useEffect, useRef} from 'react';
import {LAKE_LETTER} from '@/data/lake';

type LakeLetterProps = {
  open: boolean;
  /** Closing from the crack surfaces; from the overview it only closes. */
  underwater: boolean;
  onClose: () => void;
};

export function LakeLetter({open, underwater, onClose}: LakeLetterProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 400);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose, open]);

  return (
    <div className="lake-letter" data-open={open || undefined} aria-hidden={!open} inert={!open}>
      <article className="lake-letter-panel" role="dialog" aria-modal="true" aria-labelledby="lake-letter-title">
        <p className="lake-letter-eyebrow">Found at the bottom</p>
        <h2 className="lake-letter-title" id="lake-letter-title">{LAKE_LETTER.title}</h2>
        <p className="lake-letter-salutation">{LAKE_LETTER.salutation}</p>
        {LAKE_LETTER.paragraphs.map((paragraph) => (
          <p className="lake-letter-copy" key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
        <p className="lake-letter-signature">{LAKE_LETTER.signature}</p>
        <button ref={closeRef} type="button" className="lake-letter-close" onClick={onClose}>
          {underwater ? 'Surface' : 'Close'}
        </button>
      </article>
    </div>
  );
}
