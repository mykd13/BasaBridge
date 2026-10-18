import { expect, test } from '@playwright/test';
import { hydrated } from './helpers';

// The dev override learner (apps/web/src/server/session.ts DEV_USER_IDS.student).
const KEY = 'bb.readingHelp.00000000-0000-4000-8000-000000000001';

test('saved reading help is never overwritten by defaults while the page hydrates', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({ textSize: 'large', lineSpacing: 'wide', highContrast: true }),
    );
    // Record every change to the three attributes, from before the boot script runs.
    const seen: string[] = [];
    (window as unknown as { __rh: string[] }).__rh = seen;
    new MutationObserver((records) => {
      for (const r of records) {
        const name = r.attributeName ?? '';
        if (r.target !== document.documentElement || !name.startsWith('data-')) continue;
        seen.push(`${name}=${document.documentElement.getAttribute(name)}`);
      }
    }).observe(document, { attributes: true, subtree: true });
  }, KEY);

  await page.goto('/account/help');
  await hydrated(page);
  await expect(page.getByLabel('Large text')).toBeChecked();

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-text-size', 'large');
  await expect(root).toHaveAttribute('data-line-spacing', 'wide');
  await expect(root).toHaveAttribute('data-contrast', 'more');

  const seen = await page.evaluate(() => (window as unknown as { __rh: string[] }).__rh);
  // The boot script did write them, and nothing wrote a default over them afterwards.
  expect(seen).toContain('data-text-size=large');
  expect(seen.filter((s) => /=(medium|normal|null)$/.test(s))).toEqual([]);
});
