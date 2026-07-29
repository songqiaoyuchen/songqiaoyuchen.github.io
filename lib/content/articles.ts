import 'server-only';

import {readdir} from 'node:fs/promises';
import path from 'node:path';
import {cache} from 'react';
import type {ArticleMetadata, ArticleModule, ArticleRecord, ArticleSummary} from './types';

const ARTICLES_DIRECTORY = path.join(process.cwd(), 'content');
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isArticleMetadata(value: unknown): value is Omit<ArticleMetadata, 'slug'> {
  if (!value || typeof value !== 'object') return false;

  const article = value as Partial<ArticleMetadata>;

  return typeof article.title === 'string'
    && typeof article.description === 'string'
    && typeof article.publishedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(article.publishedAt)
    && typeof article.readingMinutes === 'number'
    && Array.isArray(article.tags)
    && article.tags.every((tag) => typeof tag === 'string');
}

export const getArticleSlugs = cache(async () => {
  const entries = await readdir(ARTICLES_DIRECTORY, {withFileTypes: true});

  return entries
    .filter((entry) => entry.isDirectory() && SLUG_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort();
});

export const getArticle = cache(async (slug: string): Promise<ArticleRecord | undefined> => {
  const slugs = await getArticleSlugs();
  if (!slugs.includes(slug)) return undefined;

  const articleModule = await import(`@/content/${slug}/index.mdx`) as ArticleModule;

  if (!isArticleMetadata(articleModule.article)) {
    throw new Error(`Article metadata is invalid for "${slug}".`);
  }

  return {
    ...articleModule.article,
    Content: articleModule.default,
    slug,
  };
});

export const getAllArticles = cache(async (): Promise<ArticleSummary[]> => {
  const slugs = await getArticleSlugs();
  const articles = await Promise.all(slugs.map((slug) => getArticle(slug)));

  return articles
    .filter((article): article is ArticleRecord => article !== undefined)
    .map((article) => ({
      description: article.description,
      publishedAt: article.publishedAt,
      readingMinutes: article.readingMinutes,
      slug: article.slug,
      tags: article.tags,
      title: article.title,
    }))
    .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt));
});
