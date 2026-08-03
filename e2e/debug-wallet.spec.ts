import { test, expect } from '@playwright/test';

test('check wallet logs', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => logs.push(`[pageerror] ${error.message}`));

  await page.goto('/agent/login');
  await page.getByPlaceholder('Username').fill('Deluxe001');
  await page.getByPlaceholder('Password').fill('deluxe123');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/agent/dashboard');
  
  await page.click('text=My Wallet');
  
  await page.waitForTimeout(5000);
  
  console.log('--- BROWSER LOGS ---');
  logs.forEach(l => console.log(l));
  console.log('--------------------');
  
  const text = await page.locator('body').innerText();
  console.log('Page text starts with:', text.substring(0, 100).replace(/\n/g, ' '));
});
