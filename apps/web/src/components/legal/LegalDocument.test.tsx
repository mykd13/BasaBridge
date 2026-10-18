import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { messagesFor } from '@/i18n/messages';
import { withIntl } from '@/i18n/test-intl';
import { LANGS, type Lang } from '@/i18n/types';
import { PROVIDERS } from '@/legal/providers';
import { LEGAL_KINDS, LEGAL_VERSIONS, type LegalKind } from '@/legal/versions';
import { LegalDocument } from './LegalDocument';
import { LegalLinks } from './LegalLinks';

const render = (kind: LegalKind, lang: Lang, contact: string | null = 'privacy@example.org') =>
  renderToStaticMarkup(
    withIntl(<LegalDocument variant={kind} lang={lang} contact={contact} />, lang),
  );

describe('LegalDocument', () => {
  it('draws one h1 and the version for every document', () => {
    for (const kind of LEGAL_KINDS) {
      for (const lang of LANGS) {
        const html = render(kind, lang);
        expect(html.match(/<h1/g), `${kind} ${lang}`).toHaveLength(1);
        expect(html).toContain(
          messagesFor(lang, 'standard').legal.version.replace(
            '{version}',
            String(LEGAL_VERSIONS[kind]),
          ),
        );
      }
    }
  });

  it('shows the draft notice on every page', () => {
    expect(render('privacy', 'en')).toMatch(/awaiting qualified review/i);
    expect(render('terms', 'fil')).toMatch(/naghihintay ng kwalipikadong pagsusuri/i);
    expect(render('kidsSummary', 'en')).toMatch(/awaiting qualified review/i);
  });

  it('lists every provider with what it sees and never sees', () => {
    const html = render('privacy', 'en');
    for (const provider of PROVIDERS) {
      expect(html).toContain(provider.name.en);
      expect(html).toContain(provider.neverSees.en.replace(/&/g, '&amp;'));
    }
  });

  it('links the contact address, and says so plainly when it is missing', () => {
    expect(render('privacy', 'en')).toContain('href="mailto:privacy@example.org"');
    const missing = render('terms', 'en', null);
    expect(missing).not.toContain('mailto:');
    expect(missing).toContain('contact address is not set yet');
  });

  it('draws the kids summary in simple wording with a place for a speaker button per paragraph', () => {
    const html = render('kidsSummary', 'en');
    expect(html).toContain('We use your voice to check your reading.');
    expect(html.match(/bb-legal__paragraph/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it('writes the page in the language it was given', () => {
    expect(render('privacy', 'fil')).toContain('lang="fil"');
    expect(render('privacy', 'fil')).toContain('Abiso sa privacy');
  });
});

describe('LegalLinks', () => {
  it('links the three documents in both languages', () => {
    for (const lang of LANGS) {
      const html = renderToStaticMarkup(withIntl(<LegalLinks />, lang));
      for (const href of ['/privacy', '/terms', '/privacy/kids'])
        expect(html).toContain(`href="${href}"`);
    }
  });
});
