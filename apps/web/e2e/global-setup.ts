import type { FullConfig } from '@playwright/test';

/**
 * The dev server compiles a route the first time it is asked for, and a browser that asks mid
 * compile can reload in a loop. Ask once up front so the specs see a warm server.
 */
export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0]?.use.baseURL;
  const paths = [
    '/sign-in',
    '/sign-up',
    '/home',
    '/learn',
    '/read',
    '/read/questions',
    '/progress',
    '/account',
    '/dev/components',
  ];
  for (const path of paths) await fetch(`${base}${path}`);
}
