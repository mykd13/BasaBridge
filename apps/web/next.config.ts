import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { assertPrivacyContact } from './src/legal/contact.ts';
import { NO_STORE_SOURCE } from './src/lib/no-store.ts';

// A production deployment must name who answers privacy questions (BB-69).
assertPrivacyContact(process.env);

// Locale comes from the request (cookie or browser), not the URL. See src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  // The e2e run starts a second dev server as a parent (BB_DEV_ROLE=parent) and gives it its own
  // build folder, because two dev servers cannot share one. Unset, this is the default `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
  // The legal pages read their markdown at request time, so the files must ship with the function.
  outputFileTracingIncludes: {
    '/privacy': ['./src/legal/*.md'],
    '/terms': ['./src/legal/*.md'],
    '/privacy/kids': ['./src/legal/*.md'],
  },
  async headers() {
    return [{ source: NO_STORE_SOURCE, headers: [{ key: 'Cache-Control', value: 'no-store' }] }];
  },
};

export default withNextIntl(config);
