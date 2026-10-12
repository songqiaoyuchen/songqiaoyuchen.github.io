// Blog drawer panel: the three latest articles and a link to the full archive.
'use client';

import Link from 'next/link';
import {BLOG_EMPTY, BLOG_INTRO} from '@/data/blog';
import type {ArticleSummary} from '@/lib/content/types';
import {panelStyles} from '../Drawer.styles';
import {usePanelScrollEdges} from '../usePanelScrollEdges';
import {BlogPanelArticle} from './BlogPanelArticle';

interface BlogPanelProps {
  articles: readonly ArticleSummary[];
  isOpen: boolean;
}

export function BlogPanel({articles, isOpen}: BlogPanelProps) {
  const {shellRef, scrollRef, updateScrollState} = usePanelScrollEdges(isOpen, false);

  return (
    <div
      className="group/blog relative h-full min-h-0"
      data-at-end="false"
      ref={shellRef}
    >
      <div
        aria-label="Blog panel content"
        className={panelStyles.scroll}
        onScroll={updateScrollState}
        ref={scrollRef}
        role="region"
      >
        <div className={panelStyles.content}>
          <header className="mb-8">
            <h2 className={panelStyles.title}>
              Blog
            </h2>
            <p className={panelStyles.intro}>
              {BLOG_INTRO}
            </p>
          </header>

          {articles.length > 0 ? (
            <ol aria-label="Recent articles" className="m-0 list-none border-t border-line p-0">
              {articles.map((article, index) => (
                <li className="border-b border-line" key={article.slug}>
                  <BlogPanelArticle article={article} index={index} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="border-y border-line py-5 font-mono text-copy leading-copy text-muted">
              {BLOG_EMPTY}
            </p>
          )}

          <Link className={`${panelStyles.viewAll} ${panelStyles.focusRing}`} href="/blog/all">
            View all writing <span aria-hidden="true" className="ml-2">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Fades the column out at the bottom until the end is reached (Drawer.css). */}
      <div
        aria-hidden="true"
        className="about-bottom-reveal pointer-events-none absolute inset-x-0 bottom-0 z-30 h-32
          transition-opacity duration-220 ease-out group-data-[at-end=true]/blog:opacity-0
          motion-reduce:duration-0"
      />
    </div>
  );
}
