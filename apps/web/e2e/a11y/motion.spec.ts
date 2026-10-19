import { expect, test, type Page } from '@playwright/test';
import { open, prepare } from './helpers';
import { ALL_ROUTES, type AuditRoute } from './routes';

/**
 * prefers-reduced-motion: reduce. No animation or transition runs, and smooth scrolling is off.
 * It also checks the reverse on the component preview, so the test cannot pass by finding nothing.
 */
const PREVIEW: AuditRoute = { audience: 'student', path: '/dev/components', name: 'components' };

async function motion(page: Page) {
  return page.evaluate(() => {
    const seconds = (value: string) =>
      Math.max(
        ...value
          .split(',')
          .map((v) => (v.trim().endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v))),
      );
    const moving: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('nextjs-portal')) continue;
      const s = getComputedStyle(el);
      const animates = s.animationName !== 'none' && seconds(s.animationDuration) > 0.011;
      const transitions = s.transitionProperty !== 'none' && seconds(s.transitionDuration) > 0.011;
      if (animates || transitions) {
        moving.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`);
      }
    }
    return {
      moving: [...new Set(moving)].slice(0, 8),
      running: document.getAnimations().filter((a) => a.playState === 'running').length,
      smooth: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
}

for (const route of [...ALL_ROUTES, PREVIEW]) {
  test(`reduced motion ${route.name} (${route.audience})`, async ({ page, baseURL }) => {
    await prepare(page, route, { lang: 'en', scheme: 'light' }, baseURL!);
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    await open(page, route, baseURL!);
    const result = await motion(page);
    expect(result.moving, 'no element animates or transitions').toEqual([]);
    expect(result.running, 'no animation is running').toBe(0);
    expect(result.smooth).not.toBe('smooth');
  });
}

test('the reduced motion test can see motion when it is allowed', async ({ page, baseURL }) => {
  await prepare(page, PREVIEW, { lang: 'en', scheme: 'light' }, baseURL!);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await open(page, PREVIEW, baseURL!);
  const result = await motion(page);
  expect(result.moving.length, 'the preview has transitions to switch off').toBeGreaterThan(0);
});
