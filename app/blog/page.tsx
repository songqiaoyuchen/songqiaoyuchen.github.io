import type {Metadata} from 'next';
import {ArticleList} from '@/components/blog/ArticleList';
import {getAllArticles} from '@/lib/content/articles';

export const metadata: Metadata = {
  description: 'Field notes on design, technology, and creative practice.',
  title: 'Blog | Song',
};

export default async function BlogPage() {
  const articles = await getAllArticles();

  return (
    <main className="relative min-h-svh overflow-x-clip bg-background pb-32 pt-18 text-text sm:pt-32">
      <div aria-hidden="true" className="blog-contours" />
      <div className="relative mx-auto max-w-6xl px-6 sm:px-10">
        <header>
          <h1 className="article-title m-0 text-4xl font-normal leading-[1.08] text-text sm:text-6xl lg:text-7xl">
            Blog
          </h1>
        </header>

        <ArticleList articles={articles} />
      </div>
    </main>
  );
}
