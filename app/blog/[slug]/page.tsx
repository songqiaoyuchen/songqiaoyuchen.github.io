import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getArticle, getArticleSlugs} from '@/lib/content/articles';

interface ArticlePageProps {
  params: Promise<{slug: string}>;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getArticleSlugs();
  const staticSlugs = slugs.length > 0 ? slugs : ['__placeholder__'];

  return staticSlugs.map((slug) => ({slug}));
}

export async function generateMetadata({params}: ArticlePageProps): Promise<Metadata> {
  const {slug} = await params;
  const article = await getArticle(slug);

  if (!article) return {};

  return {
    description: article.description,
    title: `${article.title} | SQYC`,
  };
}

export default async function ArticlePage({params}: ArticlePageProps) {
  const {slug} = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const {Content} = article;

  return (
    <main className="relative min-h-svh overflow-x-clip bg-background pb-32 text-text sm:pt-32 pt-18">
      <div aria-hidden="true"/>
      <article className="relative mx-auto max-w-6xl px-6 sm:px-10">
        <header className="border-b border-line pb-8 sm:pb-12">
          <Link
            className="inline-flex min-h-11 items-center font-mono text-label uppercase tracking-label
              text-muted transition-colors hover:text-accent focus-visible:outline-1
              focus-visible:outline-offset-4 focus-visible:outline-accent"
            href="/blog"
          >
            <span aria-hidden="true">←&nbsp;</span> All writing
          </Link>

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

        <div className="article-body mx-auto max-w-190 py-8 sm:py-12">
          <Content />
        </div>

        <footer className="mx-auto max-w-190 border-t border-line pt-8">
          <Link
            className="inline-flex min-h-11 items-center font-mono text-label uppercase tracking-label
              text-accent transition-colors hover:text-text focus-visible:outline-1
              focus-visible:outline-offset-4 focus-visible:outline-accent"
            href="/blog"
          >
            Return to the writing archive <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </footer>
      </article>
    </main>
  );
}
