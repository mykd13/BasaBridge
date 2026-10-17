import { describe, expect, it, vi } from 'vitest';
import { langFromAcceptLanguage, resolvePreferences, type Viewer } from './resolve.ts';

const signedOut: Viewer = { kind: 'signed-out' };

describe('langFromAcceptLanguage', () => {
  it('maps fil-PH, fil and tl to Filipino', () => {
    expect(langFromAcceptLanguage('fil-PH')).toBe('fil');
    expect(langFromAcceptLanguage('fil')).toBe('fil');
    expect(langFromAcceptLanguage('tl-PH,en;q=0.5')).toBe('fil');
  });

  it('maps English tags to English', () => {
    expect(langFromAcceptLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('follows quality order and skips unsupported languages', () => {
    expect(langFromAcceptLanguage('en;q=0.5, fil;q=0.9')).toBe('fil');
    expect(langFromAcceptLanguage('ja, fil;q=0.4')).toBe('fil');
    expect(langFromAcceptLanguage('fil;q=0, en;q=0.1')).toBe('en');
  });

  it('returns null when nothing matches', () => {
    expect(langFromAcceptLanguage('ja,de;q=0.8')).toBeNull();
    expect(langFromAcceptLanguage('*')).toBeNull();
    expect(langFromAcceptLanguage('')).toBeNull();
    expect(langFromAcceptLanguage(null)).toBeNull();
  });
});

describe('resolvePreferences', () => {
  it('signed out: cookie beats the browser language', () => {
    expect(
      resolvePreferences({ viewer: signedOut, cookie: 'en', acceptLanguage: 'fil-PH' }),
    ).toEqual({ lang: 'en', wording: 'standard' });
  });

  it('signed out: browser language without a cookie, then English', () => {
    expect(resolvePreferences({ viewer: signedOut, acceptLanguage: 'fil-PH' }).lang).toBe('fil');
    expect(resolvePreferences({ viewer: signedOut }).lang).toBe('en');
  });

  it('ignores a cookie with an unknown value', () => {
    expect(
      resolvePreferences({ viewer: signedOut, cookie: 'xx', acceptLanguage: 'fil' }).lang,
    ).toBe('fil');
  });

  it('learner: reading help beats the cookie and the browser', () => {
    const viewer: Viewer = {
      kind: 'learner',
      readingHelp: { language: 'fil', simpleWords: true },
    };
    expect(resolvePreferences({ viewer, cookie: 'en', acceptLanguage: 'en-US' })).toEqual({
      lang: 'fil',
      wording: 'simple',
    });
  });

  it('learner: standard wording when simple words is off', () => {
    const viewer: Viewer = { kind: 'learner', readingHelp: { language: 'en', simpleWords: false } };
    expect(resolvePreferences({ viewer }).wording).toBe('standard');
  });

  it('parent: standard wording, language from cookie or browser', () => {
    expect(resolvePreferences({ viewer: { kind: 'parent' }, cookie: 'fil' })).toEqual({
      lang: 'fil',
      wording: 'standard',
    });
  });
});

describe('getPreferences', () => {
  it('reads the cookie and Accept-Language from the request', async () => {
    vi.resetModules();
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: () => undefined }),
      headers: async () => new Headers({ 'accept-language': 'fil-PH,fil;q=0.9,en;q=0.5' }),
    }));
    vi.doMock('next-intl/server', () => ({ getRequestConfig: (fn: unknown) => fn }));
    const { getPreferences } = await import('./request.ts');
    expect(await getPreferences()).toEqual({ lang: 'fil', wording: 'standard' });
    vi.doUnmock('next/headers');
    vi.doUnmock('next-intl/server');
  });
});
