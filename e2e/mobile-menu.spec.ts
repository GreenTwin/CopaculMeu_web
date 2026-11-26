import { expect, type Page, test } from '@playwright/test';

async function useEnglish(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('copaculmeu_lang', 'en');
  });
  await page.goto('/');
}

test('phone menu holds settings and the map actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useEnglish(page);

  const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
  await expect(menuButton).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CopaculMeu' })).toHaveCount(0);

  const search = page.getByPlaceholder('Trees or parks');
  const closedSearch = await search.boundingBox();
  expect(closedSearch).not.toBeNull();
  expect(closedSearch!.x).toBeGreaterThan(390);

  await menuButton.click();
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await expect(drawer).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  const box = await drawer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThan(40);
  expect(box!.x + box!.width).toBeGreaterThan(370);
  await expect(search).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Map', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Preferences', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Needs Water' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Propose Tree' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Legend', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Needs Water' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Application & Language Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.locator('.mobile-menu-backdrop').click({ position: { x: 8, y: 200 } });
  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
});

test('phone quick actions sit on the map', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useEnglish(page);

  const actions = page.getByRole('group', { name: 'Quick actions' });
  const addTree = actions.getByRole('button', { name: 'Add tree', exact: true });
  const needsWater = actions.getByRole('button', { name: 'Needs Water', exact: true });
  await expect(addTree).toBeVisible();
  await expect(needsWater).toHaveAttribute('aria-pressed', 'false');
  const box = await needsWater.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThan(844 * 0.7);

  await needsWater.click();
  await expect(needsWater).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);

  await addTree.click();
  await expect(page.getByRole('heading', { name: 'Sign In to CopaculMeu' })).toBeVisible();
});

test('tablet keeps the header and the bottom map buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await useEnglish(page);

  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Quick actions' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Needs Water' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Where am I/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Legend', exact: true })).toBeVisible();
});
