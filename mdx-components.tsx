import type {MDXComponents} from 'mdx/types';
import {Callout} from '@/components/blog/Callout';
import {CodeBlock} from '@/components/blog/CodeBlock';
import {Figure} from '@/components/blog/Figure';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Callout,
    Figure,
    pre: CodeBlock,
    ...components,
  };
}
