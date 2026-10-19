import { expect, test, type Page } from '@playwright/test';
import { open, prepare, type Lang, type ReadingHelpSettings } from './helpers';
import { ALL_ROUTES, type AuditRoute } from './routes';

/**
 * Layout under stress, at 360 x 740 (the smallest phone we serve):
 *  - text at 200% (WCAG 1.4.4)
 *  - Filipino, which runs longer than English
 *  - reading help at its largest: large text, wide spacing, ruler and high contrast
 * Nothing may scroll sideways, run off the screen, or be cut off by its box.
 */
const MOBILE = { width: 360, height: 740 };

// The ruler only wraps story text (BB-32, part 2). The component preview is its one host on main.
const RULER_PAGE: AuditRoute = { audience: 'student', path: '/dev/components', name: 'components' };

const MAX_HELP: ReadingHelpSettings = {
  textSize: 'large',
  lineSpacing: 'wide',
  readingRuler: true,
  highContrast: true,
};

interface Variant {
  name: string;
  lang: Lang;
  zoom?: number;
  help?: ReadingHelpSettings;
}

const VARIANTS: Variant[] = [
  { name: 'text at 200%', lang: 'en', zoom: 2 },
  { name: 'Filipino', lang: 'fil' },
  { name: 'Filipino at 200%', lang: 'fil', zoom: 2 },
  { name: 'reading help at its largest', lang: 'en', help: MAX_HELP },
  { name: 'Filipino with reading help at its largest', lang: 'fil', help: MAX_HELP },
];

interface Problems {
  sideways: number;
  offscreen: string[];
  clipped: string[];
}

/** Anything that makes the page wider than the screen, or hides text inside its own box. */
async function findProblems(page: Page): Promise<Problems> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} "${(el.textContent ?? '').trim().replace(/\\s+/g, ' ').slice(0, 30)}"`;
    // A scroll box on purpose (a wide table, with tabindex so the keyboard can scroll it).
    const scroller = (el: Element | null) => {
      for (let p = el; p && p !== doc; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true;
      }
      return false;
    };
    const offscreen: string[] = [];
    const clipped: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('nextjs-portal, script, style, .bb-skip, .bb-sr-only, [hidden]')) continue;
      if (!(el as HTMLElement).checkVisibility?.()) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if ((box.right > innerWidth + 1 || box.left < -1) && !scroller(el)) {
        offscreen.push(describe(el));
      }
      const style = getComputedStyle(el);
      const hides = /(hidden|clip)/.test(style.overflowX) || style.textOverflow === 'ellipsis';
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (hides && hasText && el.scrollWidth > el.clientWidth + 1) clipped.push(describe(el));
      // Text taller than a fixed-height box.
      const hidesY = /(hidden|clip)/.test(style.overflowY);
      if (hidesY && hasText && el.scrollHeight > el.clientHeight + 1) clipped.push(describe(el));
    }
    return {
      sideways: doc.scrollWidth - doc.clientWidth,
      offscreen: offscreen.slice(0, 8),
      clipped: clipped.slice(0, 8),
    };
  });
}

/** Zoom the text as a browser's 200% setting does: the root font size doubles. */
async function zoomText(page: Page, factor: number) {
  await page.evaluate((f) => {
    const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
    document.documentElement.style.fontSize = `${size * f}px`;
  }, factor);
}

for (const variant of VARIANTS) {
  test.describe(variant.name, () => {
    test.use({ viewport: MOBILE });
    // The dev server is shared, so keep Firefox and WebKit to the layout checks that differ most.
    const routes = variant.help ? [...ALL_ROUTES, RULER_PAGE] : ALL_ROUTES;

    for (const route of routes) {
      test(`${route.name} (${route.audience})`, async ({ page, baseURL }) => {
        await prepare(
          page,
          route,
          { lang: variant.lang, scheme: 'light', highContrast: !!variant.help, help: variant.help },
          baseURL!,
        );
        await open(page, route, baseURL!);
        await page.evaluate(() =>
          document.querySelectorAll('details').forEach((d) => (d.open = true)),
        );
        if (variant.zoom) await zoomText(page, variant.zoom);
        if (variant.help && route === RULER_PAGE) {
          // Outside the student shell, so nothing applies reading help. Set what it would set.
          await page.evaluate(() => {
            const root = document.documentElement;
            root.setAttribute('data-text-size', 'large');
            root.setAttribute('data-line-spacing', 'wide');
            root.setAttribute('data-contrast', 'more');
          });
        }
        const problems = await findProblems(page);
        expect(problems.offscreen, 'content runs off the screen').toEqual([]);
        expect(problems.clipped, 'text is cut off by its box').toEqual([]);
        expect(problems.sideways, 'the page scrolls sideways').toBeLessThanOrEqual(0);
      });
    }
  });
}
