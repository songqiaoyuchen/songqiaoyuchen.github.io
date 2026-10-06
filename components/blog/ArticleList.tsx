// Archive list on /blog: numbered rows with title, summary, tags, date and reading time.
import Link from 'next/link';
import type {ArticleSummary} from '@/lib/content/types';

interface ArticleListProps {
  articles: readonly ArticleSummary[];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function ArticleList({articles}: ArticleListProps) {
  return (
    <section aria-labelledby="article-index-title" className="py-8 sm:py-12">
      <h2 className="sr-only" id="article-index-title">Article index</h2>

      {articles.length > 0 ? (
        <ol className="m-0 list-none border-t border-line p-0">
          {articles.map((article, index) => (
            <li className="border-b border-line" key={article.slug}>
              <Link
                className="group grid gap-5 py-8 outline-none transition-colors hover:bg-surface-soft
                  focus-visible:bg-surface-soft sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:px-4"
                href={`/blog/${article.slug}`}
              >
                <span className="font-mono text-label tracking-label text-dim">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  <span className="block font-serif text-2xl leading-tight text-text transition-colors
                    group-hover:text-accent group-focus-visible:text-accent sm:text-3xl">
                    {article.title}
                  </span>
                  <span className="mt-3 block max-w-2xl font-mono text-sm leading-7 text-muted">
                    {article.description}
                  </span>
                  <span className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
                    {article.tags.map((tag) => (
                      <span className="font-mono text-label uppercase tracking-label text-accent-soft" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="flex items-start justify-between gap-4 sm:block sm:text-right">
                  <time
                    className="block font-mono text-label uppercase tracking-label text-muted"
                    dateTime={article.publishedAt}
                  >
                    {formatDate(article.publishedAt)}
                  </time>
                  <span className="mt-3 block font-mono text-label uppercase tracking-label text-dim">
                    {article.readingMinutes} min read
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 border-y border-line py-16 text-center font-serif text-2xl text-text">
          I&apos;ll write something here later... :)
        </p>
      )}
    </section>
  );
}
