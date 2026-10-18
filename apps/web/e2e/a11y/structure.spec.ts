import { expect, test } from '@playwright/test';
import { open, prepare } from './helpers';
import { ALL_ROUTES } from './routes';

/** Page structure that axe only partly covers: one h1, one main, no skipped heading level. */
for (const route of ALL_ROUTES) {
  test(`structure ${route.name} (${route.audience})`, async ({ page, baseURL }) => {
    await prepare(page, route, { lang: 'en', scheme: 'light' }, baseURL!);
    await open(page, route, baseURL!);

    // A closed <details> hides its headings from axe and from the accessibility tree, so open
    // them: the content is one click away and must still be in order.
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));

    const info = await page.evaluate(() => {
      const visible = (el: Element) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return box.width > 0 && box.height > 0 && style.visibility !== 'hidden';
      };
      // The Next.js dev overlay is not our markup.
      const mine = (el: Element) => !el.closest('nextjs-portal');
      const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role=heading]')]
        .filter((el) => mine(el) && visible(el))
        .map((el) => ({
          level: el.getAttribute('aria-level')
            ? Number(el.getAttribute('aria-level'))
            : Number(el.tagName.slice(1)),
          text: (el.textContent ?? '').trim().slice(0, 40),
        }));
      const mains = [...document.querySelectorAll('main, [role=main]')].filter(mine);
      return {
        headings,
        mains: mains.length,
        nestedMain: mains.some((m) => mains.some((o) => o !== m && o.contains(m))),
      };
    });

    expect(info.mains, 'exactly one main landmark').toBe(1);
    expect(info.nestedMain, 'no main inside another main').toBe(false);
    const h1s = info.headings.filter((h) => h.level === 1);
    expect(h1s.length, `one h1, found ${JSON.stringify(h1s)}`).toBe(1);
    expect(info.headings[0]?.level, 'the h1 comes first').toBe(1);
    const skips = info.headings.filter(
      (h, i) => i > 0 && h.level > info.headings[i - 1]!.level + 1,
    );
    expect(skips, `a heading level is skipped before: ${JSON.stringify(skips)}`).toEqual([]);
  });
}
