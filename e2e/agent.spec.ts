import { test, expect } from '@playwright/test';

test.describe('Agent Portal', () => {
  test('should login successfully as an agent', async ({ page }) => {
    // Navigate to agent portal
    await page.goto('/agent/login');

    // Fill credentials
    await page.getByPlaceholder('Username').fill('Deluxe001');
    await page.getByPlaceholder('Password').fill('deluxe123');

    // Submit
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify redirect to the agent dashboard
    await page.waitForURL('**/agent');
    await expect(page).toHaveURL(/.*\/agent/);

    // Verify some element is visible, like the header or sidebar
    // Usually 'Deluxe001' or 'Logout' would be present on the authenticated shell
    await expect(page.getByText('Deluxe001').first()).toBeVisible({ timeout: 10000 });
  });
});
