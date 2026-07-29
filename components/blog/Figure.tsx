import Image from 'next/image';
import {VIEWPORT_MEDIA} from '@/config/breakpoints';
import type {ImageProps} from 'next/image';

interface FigureProps extends Omit<ImageProps, 'className'> {
  caption?: string;
  credit?: string;
}

export function Figure({alt, caption, credit, sizes, ...imageProps}: FigureProps) {
  return (
    <figure className="article-figure">
      <div className="overflow-hidden rounded-card border border-line bg-panel">
        <Image
          {...imageProps}
          alt={alt}
          className="h-auto w-full"
          sizes={sizes ?? `${VIEWPORT_MEDIA.belowMd} calc(100vw - 48px), 760px`}
        />
      </div>
      {(caption || credit) && (
        <figcaption>
          {caption}
          {caption && credit && <span aria-hidden="true"> — </span>}
          {credit && <span className="text-dim">{credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
