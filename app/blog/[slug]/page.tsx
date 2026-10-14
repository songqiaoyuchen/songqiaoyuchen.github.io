// Article route: statically generates one page per MDX article in content/.
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArticleHeader} from '@/components/blog/ArticleHeader';
import {pageStyles} from '@/components/site/page.styles';
import {getArticle, getArticleSlugs} from '@/lib/content/articles';

interface ArticlePageProps {
  params: Promise<{slug: string}>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getArticleSlugs();
  // Static export needs at least one path; the placeholder renders 404.
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
    <main className={pageStyles.main}>
      <div aria-hidden="true"/>
      <article className={`${pageStyles.container} max-w-6xl`}>
        <ArticleHeader article={article} />

        <div className="article-body mx-auto max-w-190 py-8 sm:py-12">
          <Content />
        </div>

        <footer className="mx-auto max-w-190 border-t border-line pt-8">
          <Link className={`${pageStyles.textLink} text-accent hover:text-text focus-visible:text-text`} href="/blog/all">
            Return to the writing archive <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </footer>
      </article>
    </main>
  );
}
