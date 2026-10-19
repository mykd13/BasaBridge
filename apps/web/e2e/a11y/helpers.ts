import type { BrowserContext, Page } from '@playwright/test';
import { parentURL } from '../ports';
import type { Audience, AuditRoute } from './routes';

export type Lang = 'en' | 'fil';
export type Scheme = 'light' | 'dark';

// The dev override learner (apps/web/src/server/session.ts DEV_USER_IDS.student).
export const READING_HELP_KEY = 'bb.readingHelp.00000000-0000-4000-8000-000000000001';

export interface ReadingHelpSettings {
  textSize?: 'small' | 'medium' | 'large';
  lineSpacing?: 'normal' | 'wide';
  highContrast?: boolean;
  readingRuler?: boolean;
}

/** Where a route is served: the parent routes come from the second dev server. */
export function originFor(route: AuditRoute, baseURL: string): string {
  return route.audience === 'parent' ? parentURL : baseURL;
}

export function urlFor(route: AuditRoute, baseURL: string): string {
  return `${originFor(route, baseURL)}${route.path}`;
}

export async function setLanguage(context: BrowserContext, lang: Lang, origin: string) {
  await context.addCookies([{ name: 'bb_lang', value: lang, url: origin }]);
}

export async function setReadingHelp(page: Page, settings: ReadingHelpSettings) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key as string, value as string),
    [READING_HELP_KEY, JSON.stringify(settings)],
  );
}

/** Colour scheme, plus high contrast. A learner turns it on in reading help, which only the
 * student shell applies, so the other screens get the system setting instead. */
export async function prepare(
  page: Page,
  route: AuditRoute,
  opts: { lang: Lang; scheme: Scheme; highContrast?: boolean; help?: ReadingHelpSettings },
  baseURL: string,
) {
  await setLanguage(page.context(), opts.lang, originFor(route, baseURL));
  await page.emulateMedia({
    colorScheme: opts.scheme,
    contrast: opts.highContrast && route.audience !== 'student' ? 'more' : 'no-preference',
  });
  const help = { ...opts.help };
  if (opts.highContrast && route.audience === 'student') help.highContrast = true;
  if (route.audience === 'student' && Object.keys(help).length > 0)
    await setReadingHelp(page, help);
}

/** Open a route and wait until its main landmark is there. */
export async function open(page: Page, route: AuditRoute, baseURL: string) {
  await page.goto(urlFor(route, baseURL));
  await page.waitForLoadState('load');
  await page.locator('main').first().waitFor();
}

export type { Audience };
