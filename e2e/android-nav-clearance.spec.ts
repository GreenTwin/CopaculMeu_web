import { expect, type Page, test } from '@playwright/test';

const tree = {
  id: 1,
  latitude: 45.75372,
  longitude: 21.22571,
  species: 'Acer campestre (Jugastru)',
  healthLevel: 'GOOD',
  wateringLevel: 'OPTIMAL',
  status: 'APPROVED',
  height: 10,
  age: 12,
  trunkCircumference: 60,
  locationDescription: 'Parc Central',
  lastWateredAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

async function prepareMap(page: Page, inset: string) {
  await page.addInitScript(() => {
    localStorage.setItem('copaculmeu_lang', 'en');
  });

  await page.route('**/api/trees/area*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([tree]),
    }),
  );
  await page.route('**/api/trees/1/check-ins', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    }),
  );

  await page.goto('/');
  await page.addStyleTag({
    content: `:root { --safe-area-bottom: ${inset} !important; }`,
  });
  await expect(page.locator('.tree-marker-pin')).toBeVisible();
}

async function openTree(page: Page) {
  await page.locator('.tree-marker-pin').click();
  await expect(page.getByRole('button', { name: 'Sign In for Check-in' })).toBeVisible();
}

function bottomClearance(box: { y: number; height: number }, viewportHeight: number) {
  return viewportHeight - (box.y + box.height);
}

test.describe('phone system navigation bar', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('keeps the check-in button above a 48px navigation bar', async ({ page }) => {
    await prepareMap(page, '48px');

    const viewportHeight = page.viewportSize()!.height;
    await expect(page.locator('.floating-hud')).toHaveCSS('bottom', '72px');
    const hud = await page.locator('.floating-hud').boundingBox();
    expect(hud).not.toBeNull();
    expect(bottomClearance(hud!, viewportHeight)).toBeGreaterThanOrEqual(56);

    await openTree(page);
    const button = page.getByRole('button', { name: 'Sign In for Check-in' });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(bottomClearance(box!, viewportHeight)).toBeGreaterThanOrEqual(56);
    await expect(page.locator('.tree-drawer')).toHaveCSS('bottom', '56px');
    await expect(page.locator('.floating-hud')).toHaveCSS('bottom', '72px');
  });

  test('keeps an 8px margin when the browser reports no inset', async ({ page }) => {
    await prepareMap(page, '0px');
    await openTree(page);

    const viewportHeight = page.viewportSize()!.height;
    const button = page.getByRole('button', { name: 'Sign In for Check-in' });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(bottomClearance(box!, viewportHeight)).toBeGreaterThanOrEqual(8);
    await expect(page.locator('.tree-drawer')).toHaveCSS('bottom', '8px');
  });
});

test.describe('desktop sidebar', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('ignores the phone navigation inset', async ({ page }) => {
    await prepareMap(page, '48px');
    await openTree(page);

    await expect(page.locator('.tree-drawer')).toHaveCSS('bottom', '24px');
    await expect(page.getByRole('button', { name: 'Sign In for Check-in' })).toBeVisible();
  });
});
