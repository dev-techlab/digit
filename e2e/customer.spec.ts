import { test, expect } from '@playwright/test';

test.describe('Customer Portal', () => {
  test('should login successfully as a standard user (no agent)', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // Verify some games are visible (unauthenticated state)
    await expect(page.locator('.grid > div').first()).toBeVisible();

    // Click Login
    await page.click('button:has-text("Login")');

    // Fill credentials
    await page.fill('input[name="username"]', 'player_2481');
    await page.fill('input[name="password"]', 'demo1234');

    // Submit
    await page.click('button:has-text("Login"):not([variant="outline"])');

    // Verify successful login
    await expect(page.locator('span.bg-brand-solid').filter({ hasText: '🎰' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should filter games for an agent-assigned user', async ({ page }) => {
    await page.goto('/');

    // Login as user assigned to Deluxe001
    await page.click('button:has-text("Login")');
    await page.fill('input[name="username"]', '5534453');
    await page.fill('input[name="password"]', 'member123');
    await page.click('button:has-text("Login"):not([variant="outline"])');

    // Verify successful login
    await expect(page.locator('span.bg-brand-solid').filter({ hasText: '🎰' })).toBeVisible({
      timeout: 10000,
    });

    // Verify only the agent's games are visible. Deluxe001 has 7 games.
    const gameCards = page.locator('.grid > div');
    await expect(gameCards).toHaveCount(7, { timeout: 10000 });
  });
});
