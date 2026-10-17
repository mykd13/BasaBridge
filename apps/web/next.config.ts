import type { NextConfig } from 'next';

/**
 * Pages that show a learner's or parent's data. `no-store` keeps them out of shared caches and
 * out of the browser's back-forward cache, so Back on a shared device cannot show the last
 * person's page (BB-71).
 */
export const PRIVATE_PATHS = [
  '/home',
  '/learn/:path*',
  '/learn',
  '/progress',
  '/read/:path*',
  '/read',
  '/placement/:path*',
  '/placement',
  '/account/:path*',
  '/account',
  '/parent/:path*',
  '/parent',
];

const config: NextConfig = {
  // Workspace packages ship TypeScript source, so Next compiles them.
  transpilePackages: [
    '@basabridge/contracts',
    '@basabridge/db',
    '@basabridge/learn',
    '@basabridge/levels',
    '@basabridge/mastery',
    '@basabridge/speech',
    '@basabridge/story-ai',
    '@basabridge/teacher-ai',
    '@basabridge/ui',
  ],
  async headers() {
    return PRIVATE_PATHS.map((source) => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'no-store' }],
    }));
  },
};

export default config;
