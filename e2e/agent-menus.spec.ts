import { test, expect } from '@playwright/test';

const MENUS = [
  { path: '/agent/dashboard', name: 'Dashboard' },
  { path: '/agent/my-wallet', name: 'My Wallet' },
  { path: '/agent/game-setting', name: 'Game Setting' },
  { path: '/agent/game-platforms', name: 'Game Platforms' },
  { path: '/agent/sale-agents', name: 'Sale Agent List' },
  { path: '/agent/members', name: 'Member List' },
  { path: '/agent/customers', name: 'Customer List' },
  { path: '/agent/sub-agents', name: 'Sub Agent List' },
  { path: '/agent/kiosks', name: 'Kiosk List' },
  { path: '/agent/member-rewards', name: 'Member Rewards' },
  { path: '/agent/promotions', name: 'Promotion Config' },
  { path: '/agent/store-admins', name: 'Store Administrator' },
  { path: '/agent/transactions', name: 'Transaction List' },
  { path: '/agent/cs-config', name: 'CS Config' },
  { path: '/agent/terms', name: 'Terms' },
  { path: '/agent/posters', name: 'Download posters' },
  { path: '/agent/tutorial', name: 'Tutorial' },
  { path: '/agent/doc-preview', name: 'Doc Preview' },
  { path: '/agent/change-password', name: 'Change Password' },
];

test.describe('Agent Panel Menu Sweep', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agent portal
    await page.goto('/agent/login');
    await page.getByPlaceholder('Username').fill('Deluxe001');
    await page.getByPlaceholder('Password').fill('deluxe123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/agent/dashboard');
  });

  for (const menu of MENUS) {
    test(`should load ${menu.name} without crashing`, async ({ page }) => {
      await page.goto(menu.path);
      
      // Check that Next.js error boundary did not trigger
      const hasError = await page.locator('meta[name="next-error"]').count();
      expect(hasError, `Next.js error boundary found on ${menu.path}`).toBe(0);

      // Check for generic 500 error text if any
      const text = await page.locator('body').innerText();
      expect(text.toLowerCase(), `Server error found on ${menu.path}`).not.toContain('internal server error');
      
      // Ensure page isn't just blank
      const numElements = await page.locator('body *').count();
      expect(numElements, `Page ${menu.path} appears blank`).toBeGreaterThan(10);
      
      // Take a screenshot
      await page.screenshot({ path: `e2e-screenshots/agent-${menu.path.replace('/agent/', '')}.png` });
    });
  }
});
