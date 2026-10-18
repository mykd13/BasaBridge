import { expect, test } from '@playwright/test';
import { hydrated } from './helpers';

test('private pages send Cache-Control: no-store', async ({ request }) => {
  for (const path of [
    '/home',
    '/read',
    '/learn',
    '/progress',
    '/account',
    '/parent/link',
    '/api/health',
  ]) {
    const res = await request.get(path);
    expect(res.headers()['cache-control'], path).toContain('no-store');
  }
});

test('sign out clears bb: session keys and Back shows no cached page', async ({ page }) => {
  await page.goto('/home');
  await hydrated(page);
  await page.getByRole('link', { name: 'Learn' }).first().click();
  await expect(page).toHaveURL(/\/learn$/);
  // The dev server can reload a page once after a first compile, so retry if that lands mid call.
  await expect(async () => {
    await hydrated(page);
    await page.evaluate(() => {
      sessionStorage.setItem('bb:draft', 'learner A answer');
      sessionStorage.setItem('bb:try', 'a-try');
      sessionStorage.setItem('other:keep', 'not ours');
    });
  }).toPass();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect
    .poll(() => page.evaluate(() => Object.keys(sessionStorage).sort()).catch(() => null))
    .toEqual(['other:keep']);

  // Back must ask the server again. A soft navigation would show learner A's page from the
  // router cache with no request at all.
  const documentRequests: string[] = [];
  page.on('request', (req) => {
    if (req.resourceType() === 'document') documentRequests.push(new URL(req.url()).pathname);
  });
  await page.goBack();
  // Firefox may restore the old page first. It then reloads, so wait for the request.
  await expect.poll(() => documentRequests).toContain('/home');
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('bb:draft')).catch(() => 'busy'))
    .toBeNull();
});

// Needs real accounts. Sign in and create an account are placeholders until BB-7 (A1, A2),
// and the brief says never to seed users, so this stays off until those screens exist.
test.fixme('learner B sees nothing from learner A after A signs out', async ({ page }) => {
  // 1. Create learner A through /sign-up and read something that puts text on screen.
  // 2. Sign out, then create learner B through /sign-up.
  // 3. Expect none of A's text on any page, and Back to show the sign-in page, not A's pages.
  await page.goto('/sign-up');
});
