import type {Artwork} from '@/data/artworks';

// One caption for every Art view, ordered like a museum wall label: title,
// then material and size, then the note. Views position it; it sets the type.
export function ArtworkLabel({
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
