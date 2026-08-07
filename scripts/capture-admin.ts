import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3210/admin/login');
  await page.fill('input[placeholder="Email"]', 'admin@octanlink.com');
  await page.fill('input[placeholder="Password"]', 'admin123');
  await page.click('button:has-text("Login")');
  
  // Wait a moment for network or error
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: path.join(process.cwd(), 'admin_login_error.png') });
  
  // console.log('Current URL:', page.url());
  const errorText = await page.locator('form').innerText();
  // console.log('Form Text:', errorText);
  
  await browser.close();
})();
