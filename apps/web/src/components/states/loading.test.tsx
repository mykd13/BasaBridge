import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { withIntl } from '@/i18n/test-intl';
import { PageLoading } from './PageLoading';

describe('loading screens', () => {
  it('names the wait for screen readers and marks the region busy', () => {
    const html = renderToStaticMarkup(withIntl(<PageLoading />));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading');
    expect(renderToStaticMarkup(withIntl(<PageLoading />, 'fil'))).toContain('Naglo-load');
  });

  it.each(['read', 'read/questions', 'learn'])('has a loading.tsx for %s', (route) => {
    const file = new URL(`../../app/(student)/(main)/${route}/loading.tsx`, import.meta.url);
    expect(existsSync(fileURLToPath(file))).toBe(true);
  });
});
