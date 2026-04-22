import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('admin can log in and reach the dashboard', async ({ page }) => {
  await loginAsAdmin(page);

  await expect(page.getByText('System overview')).toBeVisible();
  await expect(page.getByText('Quick actions')).toBeVisible();
});
