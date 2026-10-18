import { expect, test, type Page } from '@playwright/test';

/** The three documents, with a word each language must show in its heading. */
const DOCS = [
  { link: 'Privacy notice', path: '/privacy', heading: /^Privacy notice$/ },
  { link: 'Terms of use', path: '/terms', heading: /^Terms of use$/ },
  { link: 'Privacy for kids', path: '/privacy/kids', heading: /^Privacy for kids$/ },
] as const;

async function footerLinks(page: Page) {
  return page.getByRole('navigation', { name: 'Legal' });
}

test.describe('legal links', () => {
  for (const start of ['/sign-in', '/sign-up']) {
    test(`${start} links the privacy notice, the terms and the kids summary`, async ({ page }) => {
      for (const doc of DOCS) {
        await page.goto(start);
        await (await footerLinks(page)).getByRole('link', { name: doc.link }).click();
        await expect(page).toHaveURL(new RegExp(`${doc.path}$`));
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.heading);
        await expect(page.getByText(/awaiting qualified review/i).first()).toBeVisible();
      }
    });
  }

  test('the pages open without signing in, even with a signed-in dev role on the server', async ({
    request,
  }) => {
    for (const doc of DOCS) {
      const res = await request.get(doc.path, { maxRedirects: 0 });
      expect(res.status(), doc.path).toBe(200);
    }
  });

  test('a signed-in page has the same links in its footer', async ({ page }) => {
    await page.goto('/home');
    await expect(await footerLinks(page)).toBeVisible();
    await expect(
      (await footerLinks(page)).getByRole('link', { name: 'Privacy for kids' }),
    ).toHaveAttribute('href', '/privacy/kids');
  });

  test('Filipino shows the Filipino document', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'bb_lang', value: 'fil', url: baseURL! }]);
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Abiso sa privacy');
    await expect(page.locator('article')).toHaveAttribute('lang', 'fil');
  });

  test('the kids summary has a speaker button for each paragraph and the draft note', async ({
    page,
  }) => {
    await page.goto('/privacy/kids');
    const paragraphs = page.locator('.bb-legal__paragraph, .bb-legal__note');
    const count = await paragraphs.count();
    expect(count).toBeGreaterThanOrEqual(7);
    await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(count);
  });

  test('the provider list is on the privacy notice', async ({ page }) => {
    await page.goto('/privacy');
    await expect(
      page.getByRole('heading', { name: /Vercel AI Gateway and Google Gemini/ }),
    ).toBeVisible();
    await expect(page.getByText('What it never sees').first()).toBeVisible();
  });
});
