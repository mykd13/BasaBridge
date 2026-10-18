import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { withIntl } from '@/i18n/test-intl';

let pathname = '/sign-in';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, redirect: vi.fn() }));

const { SignedOutHeader } = await import('./SignedOutHeader');

const render = () => renderToStaticMarkup(withIntl(<SignedOutHeader />));

describe('SignedOutHeader', () => {
  it('links sign in to create an account, and back', () => {
    pathname = '/sign-in';
    expect(render()).toContain('href="/sign-up"');
    pathname = '/sign-up';
    expect(render()).toContain('href="/sign-in"');
  });

  it('keeps the logo and the language switch but no account link on the legal pages', () => {
    for (pathname of ['/privacy', '/terms', '/privacy/kids']) {
      const html = render();
      expect(html, pathname).not.toContain('href="/sign-up"');
      expect(html, pathname).not.toContain('href="/sign-in"');
      expect(html, pathname).toContain('BasaBridge');
      expect(html, pathname).toContain('English');
    }
  });
});
