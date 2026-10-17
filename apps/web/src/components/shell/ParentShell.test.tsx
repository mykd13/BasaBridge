import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/parent/link', redirect: vi.fn() }));

const { ParentShell } = await import('./ParentShell');

describe('ParentShell', () => {
  const out = renderToStaticMarkup(
    <ParentShell>
      <p>Page body</p>
    </ParentShell>,
  );

  it('has no student items', () => {
    for (const label of ['Home', 'Learn', 'My progress', 'My account']) {
      expect(out).not.toContain(`>${label}<`);
    }
    for (const href of ['/home', '/learn', '/progress', '/account']) {
      expect(out).not.toContain(`href="${href}"`);
    }
  });

  it('shows the parent account and a sign out form', () => {
    expect(out).toMatch(
      /href="\/parent"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/parent"/,
    );
    expect(out).toContain('Parent account');
    expect(out).toMatch(/<form[^>]*><button type="submit"[^>]*>[\s\S]*Sign out<\/button><\/form>/);
  });

  it('has a skip link and the main landmark', () => {
    expect(out).toContain('href="#main"');
    expect(out).toContain('<main id="main"');
  });
});
