import { expect, test } from '@playwright/test';

// Runs in the mobile-360 project only (360 x 740).
const PAGES = [
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

for (const path of PAGES) {
  test.describe(path, () => {
    test('has no horizontal scroll', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('load');
      const { scroll, width } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: document.documentElement.clientWidth,
      }));
      expect(width).toBe(360);
      expect(scroll).toBeLessThanOrEqual(width);
    });

    test('has touch targets of at least 44 x 44', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('load');
      const small = await page.evaluate(() => {
        const targets = document.querySelectorAll<HTMLElement>(
          'a[href], button, input:not([type=hidden]), select, textarea, [role=tab], [role=button]',
        );
        const out: string[] = [];
        for (const el of targets) {
          // The skip link sits off screen until focused, and sr-only controls are not touched.
          if (el.closest('.bb-skip, .bb-sr-only, [hidden]')) continue;
          // A checkbox or radio is tapped through its label, so the label is the target.
          const isCheck = el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type);
          const box = (isCheck ? (el.closest('label') ?? el) : el).getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          if (box.width < 44 || box.height < 44) {
            out.push(
              `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
            );
          }
        }
        return out;
      });
      expect(small).toEqual([]);
    });
  });
}
