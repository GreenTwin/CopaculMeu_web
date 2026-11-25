import { expect, type Page, test } from '@playwright/test';

const user = {
  id: '1',
  email: 'ana@example.com',
  name: 'Ana Pop',
  role: 'USER',
  status: 'ACTIVE',
};

const species = [
  { id: 1, name: 'Tei', scientificName: 'Tilia cordata', commonName: 'Tei' },
  { id: 2, name: 'Stejar', scientificName: 'Quercus robur', commonName: 'Stejar' },
];

async function signInAndOpenPropose(page: Page) {
  await page.addInitScript((storedUser) => {
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbmEifQ.sig');
    sessionStorage.setItem('copaculmeu_user', JSON.stringify(storedUser));
    localStorage.setItem('copaculmeu_lang', 'en');
  }, user);

  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    }),
  );
  await page.route('**/api/species', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(species),
    }),
  );

  await page.goto('/');
  await page.getByRole('button', { name: 'Propose Tree' }).click();
  await expect(page.getByRole('heading', { name: 'Propose a New Tree' })).toBeVisible();
}

async function expectCenteredMenuCaret(page: Page) {
  const menu = await page.locator('.propose-modal select').first().evaluate((el) => {
    const computed = getComputedStyle(el);
    const field = el.getBoundingClientRect();
    return {
      appearance: computed.appearance,
      image: computed.backgroundImage,
      positionY: computed.backgroundPositionY,
      paddingRight: Number.parseFloat(computed.paddingRight),
      right: field.right,
    };
  });
  expect(menu.appearance).toBe('none');
  expect(menu.image).not.toBe('none');
  expect(menu.positionY).toBe('50%');
  expect(menu.paddingRight).toBeGreaterThan(30);

  const caret = await page.locator('.species-action-btn.toggle-btn').evaluate((el) => {
    const icon = el.getBoundingClientRect();
    const field = el.closest('.species-select-control')!.getBoundingClientRect();
    return {
      offset: Math.abs(icon.top + icon.height / 2 - (field.top + field.height / 2)),
      inset: field.right - icon.right,
    };
  });
  expect(caret.offset).toBeLessThan(2);
  expect(caret.inset).toBeGreaterThan(10);
  expect(caret.inset).toBeLessThan(20);
}

test.describe('phone propose sheet', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    geolocation: { latitude: 45.75372, longitude: 21.22571 },
    permissions: ['geolocation'],
  });

  test('fills the screen and keeps the measurement and species list inside the sheet', async ({ page }) => {
    await signInAndOpenPropose(page);

    const dialog = page.getByRole('dialog');
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.width).toBeGreaterThan(370);
    expect(dialogBox!.height).toBeGreaterThan(800);

    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue to Tree Details' })).toHaveCount(0);
    await expect(page.getByText('Step 1: Confirm and fine-tune position on map')).toBeHidden();

    const hint = page.getByText('(capped at max 1.0 m)');
    await expect(hint).toBeVisible();
    const hintBox = await hint.boundingBox();
    expect(hintBox).not.toBeNull();
    expect(hintBox!.x).toBeGreaterThanOrEqual(dialogBox!.x);
    expect(hintBox!.x + hintBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1);

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expectCenteredMenuCaret(page);
    await expect(page.locator('.species-dropdown-list')).toHaveCount(0);
    await page.getByRole('dialog').getByPlaceholder('Search species', { exact: true }).click();

    const list = page.locator('.species-dropdown-list');
    const landmark = page.getByText('Landmark / Location description');
    await expect(list).toBeVisible();
    await landmark.scrollIntoViewIfNeeded();
    const listBox = await list.boundingBox();
    const landmarkBox = await landmark.boundingBox();
    expect(listBox).not.toBeNull();
    expect(landmarkBox).not.toBeNull();
    expect(landmarkBox!.y).toBeGreaterThan(listBox!.y + listBox!.height - 1);

    const popupPosition = await page.locator('.species-dropdown-popup').evaluate((el) => getComputedStyle(el).position);
    expect(popupPosition).toBe('static');
  });
});

test.describe('desktop propose card', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: 45.75372, longitude: 21.22571 },
    permissions: ['geolocation'],
  });

  test('keeps the centered card and the long action label', async ({ page }) => {
    await signInAndOpenPropose(page);

    const dialog = page.getByRole('dialog');
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.width).toBeLessThan(600);
    expect(dialogBox!.height).toBeLessThan(760);

    await expect(page.getByRole('button', { name: 'Continue to Tree Details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
    await expect(page.getByText('Step 1: Confirm and fine-tune position on map')).toBeVisible();
  });
});
