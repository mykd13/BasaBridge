import type { ReadingHelp } from '@basabridge/contracts';
import { DEFAULT_LANG, LANGS, type Lang, type Wording } from './types.ts';

export const LANG_COOKIE = 'bb_lang';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** Map one language tag to a supported language, or null. fil, fil-PH and tl all mean Filipino. */
export function langFromTag(tag: string): Lang | null {
  const primary = tag.trim().toLowerCase().split('-')[0];
  if (primary === 'fil' || primary === 'tl') return 'fil';
  if (primary === 'en') return 'en';
  return null;
}

/** First supported language in an Accept-Language header, highest quality first. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang | null {
  if (!header) return null;
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.split(';');
      const q = params.map((p) => /^\s*q=([\d.]+)/.exec(p)?.[1]).find(Boolean);
      return { tag, q: q === undefined ? 1 : Number(q), index };
    })
    .filter((item) => item.tag.trim() !== '' && item.tag.trim() !== '*' && item.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    const lang = langFromTag(tag);
    if (lang) return lang;
  }
  return null;
}

export type Viewer =
  | { kind: 'learner'; readingHelp: Pick<ReadingHelp, 'language' | 'simpleWords'> }
  | { kind: 'parent' }
  | { kind: 'signed-out' };

export interface Preferences {
  lang: Lang;
  wording: Wording;
}

/**
 * Language and wording for one request.
 * Learner: their reading help settings. Parent: cookie or browser, standard wording.
 * Signed out: cookie, then browser language, then English, standard wording.
 */
export function resolvePreferences(input: {
  viewer: Viewer;
  cookie?: string | undefined;
  acceptLanguage?: string | null | undefined;
}): Preferences {
  const { viewer, cookie, acceptLanguage } = input;
  if (viewer.kind === 'learner') {
    return {
      lang: viewer.readingHelp.language,
      wording: viewer.readingHelp.simpleWords ? 'simple' : 'standard',
    };
  }
  const lang =
    (isLang(cookie) ? cookie : null) ?? langFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LANG;
  return { lang, wording: 'standard' };
}
