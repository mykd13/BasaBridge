import type { Page } from '@playwright/test';

/**
 * Wait until React has attached to the page. A click before that is a plain link or form post,
 * and handlers such as sign out are not running yet. `networkidle` is not used because the dev
 * server keeps connections open.
 */
export async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const el = document.querySelector('nav a, nav button');
    return !!el && Object.keys(el).some((key) => key.startsWith('__reactProps'));
  });
}
