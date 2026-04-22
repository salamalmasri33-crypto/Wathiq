import { expect, type APIRequestContext, type Page } from '@playwright/test';

const email = process.env.WATHIQ_TEST_EMAIL ?? 'admin@example.com';
const password = process.env.WATHIQ_TEST_PASSWORD ?? 'Admin@123';
const apiBaseUrl = process.env.WATHIQ_API_BASE_URL ?? 'http://127.0.0.1:5005/api';

export async function loginAsAdmin(page: Page) {
  await loginWithCredentials(page, email, password);
}

export async function loginWithCredentials(page: Page, userEmail: string, userPassword: string) {
  await page.goto('/login');

  await page.getByLabel('Email').fill(userEmail);
  await page.getByLabel('Password').fill(userPassword);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function createDocumentUser(request: APIRequestContext, runId: string) {
  const adminLoginResponse = await request.post(`${apiBaseUrl}/auth/login`, {
    data: {
      email,
      password,
    },
  });

  expect(adminLoginResponse.ok()).toBeTruthy();
  const adminLogin = await adminLoginResponse.json();
  const token = adminLogin.token as string;

  const userEmail = `e2e-document-${runId}@example.com`;
  const userPassword = 'User@12345';

  const createUserResponse = await request.post(`${apiBaseUrl}/users/add`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      name: `E2E Document User ${runId}`,
      email: userEmail,
      password: userPassword,
      role: 'User',
      department: 'Testing',
    },
  });

  expect(createUserResponse.ok()).toBeTruthy();

  return {
    email: userEmail,
    password: userPassword,
  };
}
