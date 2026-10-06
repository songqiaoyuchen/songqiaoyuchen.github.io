// One article row in the Blog drawer panel: number, date, reading time, title, summary and tags.
import Link from 'next/link';
import type {ArticleSummary} from '@/lib/content/types';
import {panelStyles} from '../Drawer.styles';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

function formatDate(date: string) {
  return DATE_FORMATTER.format(new Date(`${date}T00:00:00Z`));
}

export function BlogPanelArticle({article, index}: {article: ArticleSummary; index: number}) {
  return (
    <Link
      className={`group/article flex min-h-11 flex-col px-3 py-5
        transition-colors duration-interaction hover:bg-surface-soft
        ${panelStyles.focusRing}`}
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
  );
}
