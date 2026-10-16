import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source, so Next compiles them.
  transpilePackages: [
    '@basabridge/contracts',
    '@basabridge/db',
    '@basabridge/levels',
    '@basabridge/mastery',
    '@basabridge/speech',
    '@basabridge/story-ai',
    '@basabridge/teacher-ai',
    '@basabridge/ui',
  ],
};

export default config;
