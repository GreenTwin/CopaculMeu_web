import { expect, type Page, test } from '@playwright/test';

const forgedCredential = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.sig';

const googleIdentityStub = `
  window.google = {
    accounts: {
      id: {
        initialize(config) {
          window.__e2eGoogleConfig = config;
        },
        renderButton(parent) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Continue with Google';
          button.addEventListener('click', () => {
            const credential = window.__e2eGoogleCredential;
            if (credential && window.__e2eGoogleConfig) {
              window.__e2eGoogleConfig.callback({ credential });
            }
          });
          parent.appendChild(button);
        },
        cancel() {},
      },
    },
  };
`;

async function useEnglish(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
}

async function stubGoogleIdentity(page: Page, credential: string) {
  await page.addInitScript((token) => {
    window.__e2eGoogleCredential = token;
  }, credential);
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: googleIdentityStub,
    })
  );
}

test('shows the Google button on sign in and register', async ({ page }) => {
  await useEnglish(page);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  const googleFrame = page.locator('.auth-google-button iframe');
  await expect(googleFrame).toBeVisible();
  await expect(googleFrame).toHaveAttribute('src', /accounts\.google\.com\/gsi\/button/);
  await expect(googleFrame).toHaveAttribute('src', /client_id=/);
  await expect(page.getByText('or', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create a New Account' })).toBeVisible();
  await expect(page.locator('.auth-google-button iframe')).toBeVisible();
  await expect(page.getByText('or', { exact: true })).toBeVisible();
});

test('hides the Google button in demo mode', async ({ page }) => {
  await useEnglish(page);
  await page.getByRole('button', { name: /\(\d+ trees\)/ }).click();
  await page.getByText('Demo Mode (Curated)', { exact: true }).click();
  await page.getByRole('button', { name: 'Save & Apply' }).click();

  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign In to CopaculMeu' })).toBeVisible();
  await expect(page.locator('.auth-google-button')).toHaveCount(0);
  await expect(page.getByText('or', { exact: true })).toHaveCount(0);
});

test('shows an error when Google returns a token the API rejects', async ({ page }) => {
  await stubGoogleIdentity(page, forgedCredential);
  await useEnglish(page);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect(page.getByText('Google sign-in failed. Please try again.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign In to CopaculMeu' })).toBeVisible();
});

test('signs the user in after Google returns an accepted credential', async ({ page }) => {
  const credential = 'accepted-google-credential';
  let postedToken = '';
  await stubGoogleIdentity(page, credential);
  await page.route('http://localhost:8080/api/auth/google', async (route) => {
    postedToken = (route.request().postDataJSON() as { idToken?: string }).idToken ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'e2e-access-token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'ana.pop@example.com',
          name: 'Ana Pop',
          role: 'USER',
          status: 'ACTIVE',
        },
      }),
    });
  });

  await useEnglish(page);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect(page.getByRole('heading', { name: 'Sign In to CopaculMeu' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Ana' })).toBeVisible();
  expect(postedToken).toBe(credential);

  await page.getByRole('button', { name: 'Ana' }).click();
  await expect(page.getByText('ana.pop@example.com')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible();
});
