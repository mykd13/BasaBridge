import { expect, test } from '@playwright/test';
import { hydrated } from './helpers';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('a delayed navigation waits, then shows the page', async ({ page }) => {
  await page.goto('/home');
  await hydrated(page);
  // Hold the next page's data, as a slow connection would.
  await page.route(/\/learn\?_rsc=/, async (route) => {
    await sleep(2000);
    await route.continue();
  });
  await page.getByRole('link', { name: 'Learn' }).first().click();
  // The page stays as it was while the data is held. The loading screen itself is checked in
  // src/components/states/loading.test.tsx, because the dev server does not prefetch it.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a dropped page request recovers', async ({ page }) => {
  await page.goto('/home');
  await hydrated(page);
  let dropped = 0;
  await page.route(/\/progress\?_rsc=/, async (route) => {
    dropped++;
    await route.abort('connectionreset');
  });
  await page.getByRole('link', { name: 'My progress' }).first().click();
  // Next gives up on the data request and loads the page itself.
  await expect(page).toHaveURL(/\/progress$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(dropped).toBeGreaterThan(0);
});

test('a slow document still renders', async ({ page }) => {
  await page.route('**/account', async (route) => {
    if (route.request().resourceType() === 'document') await sleep(3000);
    await route.continue();
  });
  await page.goto('/account');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
