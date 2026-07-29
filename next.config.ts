// next.config.ts
import createMDX from '@next/mdx';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  turbopack: {
    rules: {
      '*.{glsl,vert,frag,vs,fs}': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
};

const withMDX = createMDX({
  options: {
    rehypePlugins: [
      [
        'rehype-pretty-code',
        {
          bypassInlineCode: true,
          keepBackground: false,
          theme: 'dracula',
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
