// Blog archive route (/blog): every published article, newest first.
import type {Metadata} from 'next';
import {ArticleList} from '@/components/blog/ArticleList';
import {pageStyles} from '@/components/site/page.styles';
import {getAllArticles} from '@/lib/content/articles';

export const metadata: Metadata = {
  description: 'Refections, travel journals, and rant.',
  title: 'Blog | SQYC',
};

export default async function BlogPage() {
  const articles = await getAllArticles();

  return (
    <main className={pageStyles.main}>
      <div className={`${pageStyles.container} max-w-6xl`}>
        <header>
          <h1 className={pageStyles.title}>
            Blog
          </h1>
        </header>

        <ArticleList articles={articles} />
      </div>
    </main>
  );
}
