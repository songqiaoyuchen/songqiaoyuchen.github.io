'use client';

import Link from 'next/link';
import {useCallback, useEffect, useRef} from 'react';
import type {ArticleSummary} from '@/lib/content/types';
import {PANEL_SCROLL_CLASS} from '../panelStyles';

interface BlogPanelProps {
  articles: readonly ArticleSummary[];
  isOpen: boolean;
}

const FOCUS_RING = `rounded-xs focus-visible:outline-1 focus-visible:outline-offset-4
  focus-visible:outline-accent`;

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

function formatDate(date: string) {
  return DATE_FORMATTER.format(new Date(`${date}T00:00:00Z`));
}

export function BlogPanel({articles, isOpen}: BlogPanelProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const shell = shellRef.current;
    const scroll = scrollRef.current;
    if (!shell || !scroll) return;

    shell.dataset.atEnd = String(
      scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop <= 1,
    );
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(updateScrollState);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updateScrollState]);

  return (
    <div
      className="group/blog relative h-full min-h-0"
      data-at-end="false"
      ref={shellRef}
    >
      <div
        aria-label="Blog panel content"
        className={PANEL_SCROLL_CLASS}
        onScroll={updateScrollState}
        ref={scrollRef}
        role="region"
      >
        <div className="animate-drawer-content motion-reduce:animate-none">
          <header className="mb-8">
            <h2 className="mb-5 font-serif text-display font-normal italic uppercase leading-none
              text-text md:text-5xl">
              Blog
            </h2>
            <p className="m-0 max-w-copy font-mono text-copy leading-copy text-muted">
              Reflections, travel journals, and rant.
            </p>
          </header>

          {articles.length > 0 ? (
            <ol aria-label="Recent articles" className="m-0 list-none border-t border-line p-0">
              {articles.map((article, index) => (
                <li className="border-b border-line" key={article.slug}>
                  <Link
                    className={`group/article flex min-h-11 flex-col px-3 py-5
                      transition-colors duration-interaction hover:bg-surface-soft
                      ${FOCUS_RING}`}
                    href={`/blog/${article.slug}`}
                  >
                    <span className="mb-3 flex items-center justify-between gap-4 font-mono
                      text-micro uppercase tracking-meta text-muted-soft">
                      <span>
                        <span aria-hidden="true" className="mr-2 text-accent">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                      </span>
                      <span>{article.readingMinutes} min read</span>
                    </span>

                    <span className="font-serif text-card leading-snug text-text transition-colors
                      duration-interaction group-hover/article:text-accent">
                      {article.title}
                    </span>
                    <span className="mt-2 font-mono text-copy leading-copy text-muted">
                      {article.description}
                    </span>
                    <span className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-micro
                      uppercase tracking-meta text-accent-muted">
                      {article.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="border-y border-line py-5 font-mono text-copy leading-copy text-muted">
              I&apos;ll write something here later... ;)
            </p>
          )}

          <Link
            className={`mt-7 inline-flex min-h-11 items-center font-mono text-label uppercase
              tracking-label text-accent transition-colors duration-interaction hover:text-text
              ${FOCUS_RING}`}
            href="/blog"
          >
            View all writing <span aria-hidden="true" className="ml-2">&rarr;</span>
          </Link>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="about-bottom-reveal pointer-events-none absolute inset-x-0 bottom-0 z-30 h-32
          transition-opacity duration-220 ease-out group-data-[at-end=true]/blog:opacity-0
          motion-reduce:duration-0"
      />
    </div>
  );
}
