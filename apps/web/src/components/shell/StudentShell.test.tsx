import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

let pathname = '/learn';
vi.mock('next/navigation', () => ({ usePathname: () => pathname, redirect: vi.fn() }));

const { StudentShell } = await import('./StudentShell');

const render = () =>
  renderToStaticMarkup(
    <StudentShell>
      <p>Page body</p>
    </StudentShell>,
  );

describe('StudentShell', () => {
  it('lists the five items in canvas order', () => {
    const nav = render().match(/<nav[\s\S]*<\/nav>/)?.[0] ?? '';
    const labels = [
      ...nav.matchAll(/<(?:a|button)[^>]*>(?:<span[^>]*>[\s\S]*?<\/span>)?([^<]+)</g),
    ].map((m) => m[1]);
    expect(labels).toEqual(['Home', 'Learn', 'My progress', 'My account', 'Sign out']);
  });

  it('marks only the active item as the current page', () => {
    pathname = '/learn';
    const out = render();
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(out).toMatch(
      /href="\/learn"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/learn"/,
    );
  });

  it('keeps an item current on a page under it', () => {
    pathname = '/account/help';
    expect(render()).toMatch(
      /href="\/account"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/account"/,
    );
  });

  it('marks nothing current outside the menu', () => {
    pathname = '/read';
    expect(render()).not.toContain('aria-current');
  });

  it('signs out with a form, not a link', () => {
    const out = render();
    expect(out).toMatch(/<form[^>]*><button type="submit"[^>]*>[\s\S]*Sign out<\/button><\/form>/);
    expect(out).not.toMatch(/<a[^>]*>[^<]*Sign out/);
  });

  it('has a skip link to the main landmark', () => {
    const out = render();
    expect(out).toContain('href="#main"');
    expect(out).toContain('<main id="main"');
    expect(out).toContain('Page body');
  });
});
