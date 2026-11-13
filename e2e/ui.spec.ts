import { expect, type Page, test } from '@playwright/test';

async function useEnglish(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
}

function treeCount(page: Page) {
  return page.getByRole('button', { name: /\(\d+ trees\)/ });
}

test('shows the map shell in English', async ({ page }) => {
  await useEnglish(page);

  await expect(page.getByRole('heading', { name: 'CopaculMeu' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
  await expect(page.getByPlaceholder(/Search species/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Propose Tree' })).toBeVisible();
});

test('opens and closes the sign-in dialog', async ({ page }) => {
  await useEnglish(page);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Sign In to CopaculMeu' })).toBeVisible();
  await expect(page.getByLabel('Email Address *')).toBeVisible();
  await expect(page.getByLabel('Password *')).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'Sign In to CopaculMeu' })).toBeHidden();
});

test('asks a guest to sign in before proposing a tree', async ({ page }) => {
  await useEnglish(page);
  await page.getByRole('button', { name: 'Propose Tree' }).click();

  await expect(page.getByText('To propose a new tree on the map, please sign in or create a free account.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign In to CopaculMeu' })).toBeVisible();
  await expect(page.getByLabel('Full Name *')).toBeHidden();
});

test('demo mode loads curated trees and search filters them', async ({ page }) => {
  await useEnglish(page);
  await treeCount(page).click();
  await page.getByText('Demo Mode (Curated)', { exact: true }).click();
  await page.getByRole('button', { name: 'Save & Apply' }).click();

  await expect(treeCount(page)).not.toContainText('(0 trees)');

  await page.getByPlaceholder(/Search species/).fill('stejar');
  await expect(treeCount(page)).not.toContainText('(0 trees)');

  await page.getByPlaceholder(/Search species/).fill('zzz-no-such-tree');
  await expect(treeCount(page)).toContainText('(0 trees)');
});

test('toggles the dark theme', async ({ page }) => {
  await useEnglish(page);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Comută la tema întunecată' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
