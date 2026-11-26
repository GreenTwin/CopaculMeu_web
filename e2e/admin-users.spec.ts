import { expect, test, type Page, type Route } from '@playwright/test';

const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbmEifQ.sig';

const ana = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'ana@example.com',
  name: 'Ana Popescu',
  role: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  createdAt: '2026-01-15T10:00:00',
  lastLoginAt: '2026-11-01T12:00:00',
  treesAdded: 2,
};

const ion = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'ion@example.com',
  name: 'Ion Ionescu',
  role: 'USER' as const,
  status: 'ACTIVE' as const,
  createdAt: '2026-02-02T09:00:00',
  treesAdded: 0,
};

function pageOf(users: object[]) {
  return {
    content: users,
    totalElements: users.length,
    totalPages: users.length === 0 ? 0 : 1,
    size: 15,
    number: 0,
  };
}

async function useEnglish(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('copaculmeu_lang', 'en');
  });
}

async function signIn(page: Page, user: { id: string; role: string; name: string; email: string }) {
  await page.addInitScript(
    ({ storedToken, storedUser }) => {
      localStorage.setItem('copaculmeu_lang', 'en');
      sessionStorage.setItem('token', storedToken);
      sessionStorage.setItem('copaculmeu_user', JSON.stringify(storedUser));
    },
    { storedToken: token, storedUser: user }
  );
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });
}

async function fulfillUsers(route: Route, users: object[]) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(pageOf(users)),
  });
}

test('admin_seesUserTableWithLoginCreatedAtTreeCountTypeAndActions', async ({ page }) => {
  await signIn(page, ana);
  await page.route('**/api/admin/users**', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillUsers(route, [ana, ion]);
      return;
    }
    await route.fallback();
  });

  await page.goto('/admin/users');

  const table = page.locator('.admin-users-table');
  await expect(table).toBeVisible();
  for (const header of ['Name', 'Email', 'User type', 'Last login', 'Created at', 'Trees added']) {
    await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Change status' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0);
  await expect(table).toContainText('Ana Popescu');
  await expect(table).toContainText('ana@example.com');
  await expect(table).toContainText('Ion Ionescu');
  await expect(table).toContainText('ADMIN');
  await expect(table).toContainText('USER');
  await expect(table).toContainText('2');
  await expect(table).toContainText('0');
});

test('guest_adminUsers_showsAccessDenied', async ({ page }) => {
  await useEnglish(page);
  let listed = false;
  await page.route('**/api/admin/users**', async (route) => {
    listed = true;
    await fulfillUsers(route, []);
  });

  await page.goto('/admin/users');

  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
  await expect(page.locator('.admin-users-table')).toHaveCount(0);
  expect(listed).toBe(false);
});

test('user_adminUsers_showsAccessDenied', async ({ page }) => {
  await signIn(page, { ...ion, role: 'USER' });
  let listed = false;
  await page.route('**/api/admin/users**', async (route) => {
    listed = true;
    await fulfillUsers(route, []);
  });

  await page.goto('/admin/users');

  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
  await expect(page.locator('.admin-users-table')).toHaveCount(0);
  expect(listed).toBe(false);
});

test('admin_emptyUserList_showsEmptyState', async ({ page }) => {
  await signIn(page, ana);
  await page.route('**/api/admin/users**', async (route) => {
    await fulfillUsers(route, []);
  });

  await page.goto('/admin/users');

  await expect(page.getByText('No users found matching criteria.')).toBeVisible();
  await expect(page.locator('.admin-feedback-banner.error')).toHaveCount(0);
});

test('admin_userTable_rowsShareOneHeightWithoutHorizontalScroll', async ({ page }) => {
  await signIn(page, ana);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route('**/api/admin/users**', async (route) => {
    await fulfillUsers(route, [ana, ion]);
  });

  await page.goto('/admin/users?localAdmin=0&localUsers=0');

  const fit = await page.locator('.admin-users-directory').evaluate((wrap) => {
    const rows = [...wrap.querySelectorAll('tbody tr')];
    const heights = rows.map((row) => Math.round(row.getBoundingClientRect().height));
    return {
      wrapOverflow: wrap.scrollWidth - wrap.clientWidth,
      heights,
    };
  });
  expect(fit.wrapOverflow).toBeLessThanOrEqual(1);
  expect(fit.heights).toEqual([52, 52]);
});

test('admin_refresh_keepsRowsUntilTheNextPageArrives', async ({ page }) => {
  await signIn(page, ana);
  let releaseRefresh = () => {};
  const refreshHeld = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  let refreshStarted = false;
  await page.route('**/api/admin/users**', async (route) => {
    if (route.request().method() === 'GET' && refreshStarted) {
      await refreshHeld;
      await fulfillUsers(route, [ana]);
      return;
    }
    await fulfillUsers(route, [ana, ion]);
  });

  await page.goto('/admin/users');
  await expect(page.locator('.admin-users-table tbody')).toContainText('Ion Ionescu');
  refreshStarted = true;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.locator('.admin-users-table tbody')).toContainText('Ion Ionescu');
  await expect(page.locator('.admin-users-table tbody')).toContainText('Ana Popescu');
  releaseRefresh();
  await expect(page.locator('.admin-users-table tbody')).not.toContainText('Ion Ionescu');
  await expect(page.locator('.admin-users-table tbody')).toContainText('Ana Popescu');
});
