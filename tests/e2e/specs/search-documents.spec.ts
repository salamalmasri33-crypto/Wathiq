import { expect, test } from '@playwright/test';
import { createDocumentUser, loginWithCredentials } from './helpers';

test('user can upload a document, save metadata, and find it in search', async ({ page, request }) => {
  const runId = `${Date.now()}`;
  const title = `Playwright evidence document ${runId}`;
  const testUser = await createDocumentUser(request, runId);

  await loginWithCredentials(page, testUser.email, testUser.password);

  await page.goto('/add-document');
  await expect(page.getByRole('heading', { name: 'Upload a new document' })).toBeVisible();

  const addDocumentResponsePromise = page.waitForResponse((response) => {
    return (
      response.url().includes('/documents/Add') &&
      response.request().method() === 'POST'
    );
  });

  await page.locator('#file-upload').setInputFiles({
    name: `wathiq-e2e-${runId}.pdf`,
    mimeType: 'application/pdf',
    buffer: Buffer.from(`Wathiq Playwright upload evidence ${runId}`),
  });
  await page.getByLabel('Document title *').fill(title);
  await page.getByRole('button', { name: /Upload\s*&\s*Process/i }).click();

  const addDocumentResponse = await addDocumentResponsePromise;
  expect(addDocumentResponse.status()).toBe(200);
  const addDocumentBody = await addDocumentResponse.json();
  const documentId = addDocumentBody.document.id as string;
  expect(documentId).toBeTruthy();

  await page.getByLabel('Category *').fill('Report');
  await page.getByLabel('Keywords').fill('e2e, playwright, search');
  await page.getByLabel('Document description').fill('Created by the Playwright E2E assignment test.');
  await page.getByLabel('Department').fill('Testing');
  await page.getByLabel('Document type').fill('PDF');

  const metadataResponsePromise = page.waitForResponse((response) => {
    return (
      response.url().includes(`/documents/${documentId}/metadata`) &&
      response.request().method() === 'PUT'
    );
  });

  await expect(page.getByRole('button', { name: /Save metadata/i })).toBeEnabled();
  await page.getByRole('button', { name: /Save metadata/i }).click();

  const metadataResponse = await metadataResponsePromise;
  expect(metadataResponse.status()).toBe(200);
  await expect(page).toHaveURL(/\/my-documents$/);

  await page.goto('/search');
  await expect(page.getByRole('heading', { name: 'Search documents' })).toBeVisible();
  await expect(page.getByText('Search options')).toBeVisible();

  const searchResponsePromise = page.waitForResponse((response) => {
    return (
      response.url().includes('/documents/search') &&
      response.request().method() === 'POST'
    );
  });

  await page.getByPlaceholder(/Search for a document/i).fill(title);
  await page.getByRole('button', { name: 'Search' }).click();

  const searchResponse = await searchResponsePromise;
  expect(searchResponse.status()).toBe(200);
  await expect(page.getByText(title)).toBeVisible();
});
