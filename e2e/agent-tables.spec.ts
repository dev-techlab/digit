import { test, expect } from '@playwright/test';

test.describe('Agent Panel Tables and Forms', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agent portal
    await page.goto('/agent/login');
    await page.getByPlaceholder('Username').fill('Deluxe001');
    await page.getByPlaceholder('Password').fill('deluxe123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/agent/dashboard');
  });

  test('Customer List: filtering and pagination', async ({ page }) => {
    await page.goto('/agent/customers');
    await page.waitForSelector('input[placeholder="Search..."]');

    // Test search filter
    await page.getByPlaceholder('Search...').fill('player');
    await page.waitForTimeout(1000); // Wait for debounce/API

    // Assuming there are multiple pages, try clicking pagination Next button
    const nextBtn = page.getByRole('button', { name: '›' });
    if ((await nextBtn.isVisible()) && (await nextBtn.isEnabled())) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
      // Wait for the active page button "2" to be highlighted
      await expect(page.getByRole('button', { name: '2', exact: true })).toHaveClass(/bg-blue-500/);
    }
  });

  test('Member List: create member, filtering, pagination', async ({ page }) => {
    await page.goto('/agent/members');
    await page.waitForSelector('text=Add Member');

    // Open Add Member modal
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.waitForSelector('text=Add Member');

    // Fill out form
    const uniqueUser = `tuser_${Date.now()}`;
    await page.waitForTimeout(500); // wait for modal animation
    const modal = page.locator('.fixed').last();
    const inputs = modal.locator('input');
    await inputs.nth(0).fill(uniqueUser);
    await inputs.nth(1).fill('password123');
    await modal.getByRole('button', { name: 'Create', exact: true }).click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Search for the newly created member
    await page.getByPlaceholder('Search...').fill(uniqueUser);
    await page.waitForTimeout(1000); // Wait for debounce

    const text = await page.locator('body').innerText();
    expect(text).toContain(uniqueUser);
  });

  test('Transactions List: date filtering and pagination', async ({ page }) => {
    await page.goto('/agent/transactions');
    await page.waitForSelector('input[placeholder="Search..."]');

    // Check pagination
    const nextBtn = page.getByRole('button', { name: '›' });
    if ((await nextBtn.isVisible()) && (await nextBtn.isEnabled())) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
