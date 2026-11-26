import { expect, test, type Page } from '@playwright/test';

async function useEnglish(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('copaculmeu_lang', 'en');
  });
}

test('localPreview_showsDummyUsersInAFixedTable', async ({ page }) => {
  await useEnglish(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/admin/users?localAdmin=1&localUsers=1');

  for (const header of ['Name', 'Email', 'User type', 'Last login', 'Created at', 'Trees added']) {
    await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Change status' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'Local Admin' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Ana Volunteer' })).toBeVisible();
  await expect(page.getByText('local-preview-password-hash')).toHaveCount(0);

  const fit = await page.locator('.admin-users-directory').evaluate((wrap) => {
    const rows = [...wrap.querySelectorAll('tbody tr')];
    const heights = rows.map((row) => Math.round(row.getBoundingClientRect().height));
    const roleBadges = [...wrap.querySelectorAll('.admin-badge-role')].map((node) =>
      Math.round(node.getBoundingClientRect().width)
    );
    const statusBadges = [...wrap.querySelectorAll('.admin-badge-status')].map((node) =>
      Math.round(node.getBoundingClientRect().width)
    );
    const layout = document.querySelector('.admin-page-layout');
    return {
      wrapOverflow: wrap.scrollWidth - wrap.clientWidth,
      pageOverflow: layout ? layout.scrollWidth - layout.clientWidth : 0,
      heights,
      roleBadges,
      statusBadges,
    };
  });
  expect(fit.wrapOverflow).toBeLessThanOrEqual(1);
  expect(fit.pageOverflow).toBeLessThanOrEqual(1);
  expect(new Set(fit.heights).size).toBe(1);
  expect(fit.heights[0]).toBeGreaterThan(0);
  expect(new Set(fit.roleBadges).size).toBe(1);
  expect(new Set(fit.statusBadges).size).toBe(1);
});

test('localPreview_withoutFlagsStaysAGuest', async ({ page }) => {
  await useEnglish(page);
  await page.goto('/admin/users?localAdmin=0&localUsers=0');
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Local Admin' })).toHaveCount(0);
});
