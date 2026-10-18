import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { NO_STORE_SOURCE } from './src/lib/no-store.ts';

// Locale comes from the request (cookie or browser), not the URL. See src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
    return [{ source: NO_STORE_SOURCE, headers: [{ key: 'Cache-Control', value: 'no-store' }] }];
  },
};

export default withNextIntl(config);
