// Article page header: back link, serif title and deck, publish date and reading time, tags.
import {BackLink} from '@/components/site/BackLink';
import type {ArticleMetadata} from '@/lib/content/types';

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function ArticleHeader({article}: {article: ArticleMetadata}) {
  return (
    <header className="border-b border-line pb-8 sm:pb-12">
      <BackLink href="/blog/all">All writing</BackLink>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-end">
        <div>
          <h1 className="article-title mb-0 sm:mt-5 max-w-4xl text-4xl font-normal leading-[1.08]
            text-text sm:text-6xl lg:text-7xl">
            {article.title}
          </h1>
          <p className="article-deck mb-0 mt-7 max-w-2xl text-base leading-8 text-muted">
            {article.description}
          </p>
        </div>

        <dl className="m-0 border-l border-line pl-5 font-mono text-label uppercase tracking-label">
          <div>
            <dt className="text-dim">Published</dt>
            <dd className="mb-0 ml-0 mt-2 text-muted">
              <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            </dd>
          </div>
          <div className="mt-5">
            <dt className="text-dim">Reading time</dt>
            <dd className="mb-0 ml-0 mt-2 text-muted">{article.readingMinutes} minutes</dd>
          </div>
        </dl>
      </div>

      <ul aria-label="Article tags" className="mt-8 flex list-none flex-wrap gap-2 p-0">
        {article.tags.map((tag) => (
          <li
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4
              font-mono text-label uppercase tracking-label text-accent-soft"
            key={tag}
          >{tag}</li>
        ))}
      </ul>
    </header>
  );
}
