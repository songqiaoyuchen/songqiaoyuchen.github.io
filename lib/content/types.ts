// Article metadata, module and summary types shared by the loader and blog UI.
import type {ComponentType} from 'react';

export interface ArticleMetadata {
  description: string;
  publishedAt: string;
  readingMinutes: number;
  slug: string;
  tags: readonly string[];
  title: string;
}

export interface ArticleModule {
  article: Omit<ArticleMetadata, 'slug'>;
  default: ComponentType;
}

export interface ArticleRecord extends ArticleMetadata {
  Content: ComponentType;
}

export type ArticleSummary = ArticleMetadata;
