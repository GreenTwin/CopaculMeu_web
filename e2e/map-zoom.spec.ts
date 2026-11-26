import { expect, type Page, test } from '@playwright/test';

async function expectZoomInBottomRight(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.addInitScript(() => {
    localStorage.setItem('copaculmeu_lang', 'en');
  });
  await page.goto('/');

  const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
  await expect(zoomIn).toBeVisible();
  const box = await zoomIn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThan(width * 0.7);
  expect(box!.y).toBeGreaterThan(height * 0.55);
}

test('zoom buttons sit at the bottom right on a desktop', async ({ page }) => {
  await expectZoomInBottomRight(page, 1280, 800);
});

test('zoom buttons sit at the bottom right on a tablet', async ({ page }) => {
  await expectZoomInBottomRight(page, 768, 1024);
});

test('phone hides the zoom buttons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('copaculmeu_lang', 'en');
  });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Zoom out', exact: true })).toBeHidden();
});
