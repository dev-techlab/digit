import { test, expect } from '@playwright/test';

test.describe('Admin Portal', () => {
  test('should login successfully as an admin', async ({ page }) => {
    // Navigate to admin portal
    await page.goto('/admin/login');

    // Fill credentials
    await page.getByPlaceholder('Email').fill('admin@octanlink.com');
    await page.getByPlaceholder('Password').fill('admin@123');

    // Submit
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify redirect to the admin dashboard
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/.*\/admin/);

    // Verify some element is visible, like the header or sidebar
    // Usually 'Super Admin' or 'Logout' would be present on the authenticated shell
    await expect(page.getByText('Super Admin').first()).toBeVisible({ timeout: 10000 });
  });
});
