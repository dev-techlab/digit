import { test, expect } from '@playwright/test';

test.describe('Admin Panel Tables and Forms', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin portal
    await page.goto('/admin/login');
    await page.getByPlaceholder('Email').fill('admin@octanlink.com');
    await page.getByPlaceholder('Password').fill('admin123'); // Adjust based on env/seed if it fails
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/admin');
  });

  test('Agents List: filtering and pagination', async ({ page }) => {
    await page.goto('/admin/agents');
    await page.waitForSelector('input[placeholder="Search..."]');
    
    // Type in search
    await page.getByPlaceholder('Search...').fill('Deluxe');
    await page.waitForTimeout(1000);
    
    // Check pagination
    const nextBtn = page.getByRole('button', { name: '›' });
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Users List: search and pagination', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForSelector('input[placeholder="Search..."]');
    
    // Search
    await page.getByPlaceholder('Search...').fill('player');
    await page.waitForTimeout(1000);
    
    // Check pagination
    const nextBtn = page.getByRole('button', { name: '›' });
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Deposits List: status filter and pagination', async ({ page }) => {
    await page.goto('/admin/deposits');
    await page.waitForSelector('input[placeholder="Search..."]');
    
    // Filter status
    const selectStatus = page.locator('select').first();
    await selectStatus.selectOption('completed');
    await page.waitForTimeout(1000);
    
    const nextBtn = page.getByRole('button', { name: '›' });
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
