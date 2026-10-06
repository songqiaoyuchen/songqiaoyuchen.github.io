// Museum-style wall label used by every Art view: title, then material and size, then the note.
// Views position it; it only sets the type (WallLabel.css).
import type {Artwork} from '@/data/artworks';

export function WallLabel({
  artwork,
  as: Heading = 'h2',
  className = '',
  description = true,
  titleId,
  descriptionId,
}: {
  artwork: Artwork;
  as?: 'h2' | 'h3';
  className?: string;
  /** `'alt'` falls back to the alt text when a work has no note. */
  description?: boolean | 'alt';
  titleId?: string;
  descriptionId?: string;
}) {
  const note = description ? artwork.description || (description === 'alt' ? artwork.alt : '') : '';
  return (
    <div className={`art-label ${className}`}>
      <Heading className="art-label-title" id={titleId}>{artwork.title}</Heading>
      <p className="art-label-meta">
        <span>{artwork.material}</span> <span>{artwork.size}</span>
      </p>
      {note && <p className="art-label-description" id={descriptionId}>{note}</p>}
    </div>
  );
}
