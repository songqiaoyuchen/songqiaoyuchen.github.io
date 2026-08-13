// next.config.ts
import createMDX from '@next/mdx';
import type {NextConfig} from 'next';
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: 'export' as const,
        trailingSlash: true,
        basePath,
        images: {unoptimized: true},
      }
    : {
        allowedDevOrigins: ['192.168.0.103'],
        async headers() {
          return [
            {
              source: '/textures/terrain/baked/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
            {
              source: '/textures/terrain/baked/manifest.json',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=0, must-revalidate',
                },
              ],
            },
          ];
        },
    }),
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
