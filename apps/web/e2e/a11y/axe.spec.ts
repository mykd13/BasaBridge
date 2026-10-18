import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { isChromium, open, prepare, type Lang, type Scheme } from './helpers';
import { ALL_ROUTES } from './routes';

/**
 * BB-37 part 1. Every route in scope, in English and Filipino, in light and dark, and with high
 * contrast on (reading help for a learner, the system setting elsewhere). Any serious or critical
 * axe violation fails the test.
 *
 * Axe tests the page, not the browser, so this runs in Chromium only. The other three projects
 * run the keyboard, zoom and layout checks, where browsers differ.
 */
const FAIL_ON = new Set(['serious', 'critical']);

const LANGS: Lang[] = ['en', 'fil'];
const SCHEMES: Scheme[] = ['light', 'dark'];
const CONTRAST = [false, true];

for (const route of ALL_ROUTES) {
  test.describe(`axe ${route.name} (${route.audience})`, () => {
    test.beforeEach((_fixtures, info) => {
      test.skip(
        !isChromium(info) || info.project.name === 'mobile-360',
        'Axe runs once, in Chromium',
      );
    });

    for (const lang of LANGS) {
      for (const scheme of SCHEMES) {
        for (const highContrast of CONTRAST) {
          const title = `${lang}, ${scheme}${highContrast ? ', high contrast' : ''}`;
          test(title, async ({ page, baseURL }) => {
            await prepare(page, route, { lang, scheme, highContrast }, baseURL!);
            await open(page, route, baseURL!);
            await expect(page.locator('html')).toHaveAttribute('lang', lang);

            const results = await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
              // The Next.js dev overlay is not our markup and does not exist in production.
              .exclude('nextjs-portal')
              .analyze();

            // Moderate and minor findings do not fail the run. They are attached so a reviewer
            // can read them, and A11Y_VERBOSE=1 prints them.
            const minor = results.violations.filter((v) => !FAIL_ON.has(v.impact ?? ''));
            if (minor.length > 0) {
              const summary = minor.map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s)`);
              await test.info().attach('minor-findings', { body: summary.join('\n') });
              if (process.env.A11Y_VERBOSE) console.log(route.name, title, summary.join('; '));
            }

            const failures = results.violations
              .filter((v) => FAIL_ON.has(v.impact ?? ''))
              .map((v) => ({
                rule: v.id,
                impact: v.impact,
                help: v.help,
                nodes: v.nodes.slice(0, 5).map((n) => ({
                  target: n.target.join(' '),
                  summary: n.failureSummary?.split('\n').slice(0, 3).join(' | '),
                })),
              }));
            expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
          });
        }
      }
    }
  });
}

// Proves the harness can fail: a page with a known serious violation must be reported.
test('axe reports a known low contrast page', async ({ page }, info) => {
  test.skip(!isChromium(info) || info.project.name === 'mobile-360', 'Axe runs once, in Chromium');
  await page.setContent(
    '<!doctype html><html lang="en"><head><title>t</title></head><body><main>' +
      '<h1>Title</h1><p style="color:#bbb;background:#fff">Pale text</p>' +
      '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></body></html>',
  );
  const results = await new AxeBuilder({ page }).analyze();
  const ids = results.violations.filter((v) => FAIL_ON.has(v.impact ?? '')).map((v) => v.id);
  expect(ids).toEqual(expect.arrayContaining(['color-contrast', 'image-alt']));
});
