import { expect, test } from '@playwright/test';

const email = process.env.WATHIQ_TEST_EMAIL ?? 'admin@example.com';
const password = process.env.WATHIQ_TEST_PASSWORD ?? 'Admin@123';

test('admin can log in and reach the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('System overview')).toBeVisible();
  await expect(page.getByText('Quick actions')).toBeVisible();
});
