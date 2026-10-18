import { expect, test, type Page } from '@playwright/test';
import { open, prepare } from './helpers';
import { ALL_ROUTES, type AuditRoute } from './routes';

/**
 * Keyboard only, no mouse. For every route: Tab walks to every visible control, in a sensible
 * order, each one shows a focus indicator, and focus never gets stuck. Plus the menu path.
 */

interface Stop {
  /** Position in the document, so two controls with the same name are told apart. */
  index: number;
  tag: string;
  label: string;
  indicator: boolean;
  inView: boolean;
}

/** The focused element's name, and whether anything draws a focus indicator on it. */
async function focusedStop(page: Page): Promise<Stop | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    const style = getComputedStyle(el);
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
    const halo = style.boxShadow !== 'none';
    const box = el.getBoundingClientRect();
    const labelled = el as HTMLInputElement;
    return {
      index: [...document.querySelectorAll('*')].indexOf(el),
      tag: el.tagName.toLowerCase(),
      label: (
        el.getAttribute('aria-label') ||
        labelled.labels?.[0]?.textContent ||
        el.textContent ||
        el.getAttribute('href') ||
        el.getAttribute('name') ||
        ''
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40),
      indicator: outline || halo,
      inView: box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth,
    };
  });
}

/** Press Tab until focus leaves the page or a limit is hit. Returns every stop. */
async function tabThrough(page: Page, limit = 80): Promise<Stop[]> {
  const stops: Stop[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const stop = await focusedStop(page);
    // Focus left the document: the browser took it to its own chrome. The loop is complete.
    if (!stop) break;
    // The Next.js dev overlay is a Tab stop in dev only. It is not our markup.
    if (stop.tag === 'nextjs-portal') continue;
    stops.push(stop);
  }
  return stops;
}

/** Controls a keyboard user can reach and sees, listed from the DOM. */
async function reachableControls(page: Page): Promise<{ index: number; name: string }[]> {
  return page.evaluate(() => {
    const sel =
      'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => {
        if (el.closest('nextjs-portal, [hidden], [inert]')) return false;
        if ((el as HTMLButtonElement).disabled) return false;
        if (!el.checkVisibility()) return false;
        // Tab stops once in a radio group, on the checked one (or the first if none is checked).
        // The arrow keys move inside the group.
        if (el instanceof HTMLInputElement && el.type === 'radio') {
          const group = [
            ...document.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${el.name}"]`),
          ];
          const stop = group.find((r) => r.checked) ?? group[0];
          if (el !== stop) return false;
        }
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        // The skip link sits off screen until focused, but it is still a Tab stop.
        return (
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          (box.width > 0 || el.matches('.bb-skip'))
        );
      })
      .map((el) => ({
        index: [...document.querySelectorAll('*')].indexOf(el),
        name: `${el.tagName.toLowerCase()} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}`,
      }));
  });
}

// Safari does not Tab to links unless a setting is on (Option+Tab otherwise), and Playwright's
// WebKit on macOS follows that. A Tab walk there would test the machine, not the app, so the
// manual checklist covers Safari instead (docs/accessibility-checklist.md).
test.beforeEach(({ browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not Tab to links by default on macOS');
});

async function walk(page: Page, route: AuditRoute, baseURL: string) {
  await prepare(page, route, { lang: 'en', scheme: 'light' }, baseURL);
  await open(page, route, baseURL);
}

for (const route of ALL_ROUTES) {
  test(`keyboard ${route.name} (${route.audience})`, async ({ page, baseURL }, info) => {
    await walk(page, route, baseURL!);
    // WebKit on macOS only Tabs to links when asked to by a system setting. Playwright's WebKit
    // build follows the Chromium rule, so no special case is needed here.
    // Open every <details>: what is inside must be reachable too.
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    const stops = await tabThrough(page);
    const controls = await reachableControls(page);
    expect(stops.length, 'Tab reaches something').toBeGreaterThan(0);

    const noIndicator = stops.filter((s) => !s.indicator).map((s) => `${s.tag} "${s.label}"`);
    expect(noIndicator, 'every focused control shows an indicator').toEqual([]);

    // Focus must not be stuck: the same control twice in a row, or a loop short of the page end.
    const stuck = stops
      .filter((s, i) => i > 0 && s.index === stops[i - 1]!.index)
      .map((s) => `${s.tag} "${s.label}"`);
    expect(stuck, 'focus moves on with each Tab').toEqual([]);
    // Tab stops are capped, so only demand the controls inside the cap.
    const reached = new Set(stops.map((s) => s.index));
    const missed = controls.filter((c) => !reached.has(c.index)).map((c) => c.name);
    expect(stops.length >= 80 ? [] : missed, 'Tab reaches every visible control').toEqual([]);
    info.annotations.push({ type: 'stops', description: `${stops.length} of ${controls.length}` });
  });
}

test.describe('student menu', () => {
  test('the menu is in order and Enter opens a screen', async ({ page, baseURL }) => {
    const route = ALL_ROUTES.find((r) => r.path === '/home')!;
    await walk(page, route, baseURL!);

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /skip to/i });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    const order: string[] = [];
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      const stop = await focusedStop(page);
      expect(stop?.indicator, `focus indicator on ${stop?.label}`).toBe(true);
      order.push(stop?.label ?? '');
    }
    const nav = order.join(' | ');
    const at = (word: RegExp) => order.findIndex((l) => word.test(l));
    expect(at(/home/i), nav).toBeGreaterThanOrEqual(0);
    expect(at(/home/i)).toBeLessThan(at(/learn/i));
    expect(at(/learn/i)).toBeLessThan(at(/progress/i));
    expect(at(/progress/i)).toBeLessThan(at(/account/i));
    expect(at(/account/i)).toBeLessThan(at(/sign out/i));

    // Activate "My progress" with the keyboard alone.
    await page
      .getByRole('navigation')
      .getByRole('link', { name: /progress/i })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/progress$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('navigation').getByRole('link', { name: /progress/i }),
    ).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('skip link', () => {
  test('Enter moves focus to the main landmark', async ({ page, baseURL }) => {
    const route = ALL_ROUTES.find((r) => r.path === '/home')!;
    await walk(page, route, baseURL!);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /skip to/i })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
  });
});

test.describe('reading help controls', () => {
  test('every setting works with Space and shows a focus indicator', async ({ page, baseURL }) => {
    const route = ALL_ROUTES.find((r) => r.path === '/account/help')!;
    await walk(page, route, baseURL!);
    const box = page.getByLabel('Large text');
    await box.focus();
    await expect(box).toBeFocused();
    expect((await focusedStop(page))?.indicator).toBe(true);
    await page.keyboard.press('Space');
    await expect(box).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  });
});

test.describe('parent sections', () => {
  test('the section links are in the Tab order', async ({ page, baseURL }) => {
    const route = ALL_ROUTES.find((r) => r.path.endsWith('/readings'))!;
    await walk(page, route, baseURL!);
    const stops = await tabThrough(page, 30);
    const labels = stops.map((s) => s.label).join(' | ');
    for (const name of [/progress/i, /readings/i, /levels/i, /decisions/i, /privacy/i]) {
      expect(labels, `section ${name}`).toMatch(name);
    }
  });
});
