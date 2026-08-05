import { chromium, devices } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\as\\.gemini\\antigravity-ide\\brain\\374e1bf6-83ee-4e8a-b1e8-a6e84facd73c';
const BASE_URL = 'http://localhost:3210';

const viewports = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function capture(page: any, name: string, vpName: string, vp: { width: number, height: number }) {
  await page.setViewportSize(vp);
  await sleep(1000); // let animations/responsive classes settle
  const filePath = path.join(ARTIFACTS_DIR, `${name}_${vpName}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Saved ${filePath}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. ADMIN
    console.log('Testing Admin...');
    let context = await browser.newContext();
    let page = await context.newPage();
    await page.goto(`${BASE_URL}/admin/login`);
    await page.fill('input[type="email"], input[name="email"]', 'admin@octanlink.com');
    await page.fill('input[type="password"], input[name="password"]', 'admin1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/**', { timeout: 10000 });
    await sleep(2000); // wait for dashboard to load
    
    for (const [vpName, vp] of Object.entries(viewports)) {
      await capture(page, 'admin_dashboard', vpName, vp);
    }
    
    await page.goto(`${BASE_URL}/admin/users`);
    await sleep(2000);
    for (const [vpName, vp] of Object.entries(viewports)) {
      await capture(page, 'admin_users', vpName, vp);
    }
    await context.close();

    // 2. AGENT
    console.log('Testing Agent...');
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`${BASE_URL}/agent/login`);
    // Need to handle either username or email input
    const usernameInput = await page.$('input[name="username"]');
    if (usernameInput) {
      await page.fill('input[name="username"]', 'Deluxe001');
    } else {
      await page.fill('input[type="text"]', 'Deluxe001');
    }
    await page.fill('input[type="password"]', 'deluxe123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/agent/**', { timeout: 10000 });
    await sleep(2000); // wait for dashboard
    
    for (const [vpName, vp] of Object.entries(viewports)) {
      await capture(page, 'agent_dashboard', vpName, vp);
    }
    
    await page.goto(`${BASE_URL}/agent/wallets`); // Assuming there is a wallets page, maybe? Or /agent/members?
    await sleep(2000);
    for (const [vpName, vp] of Object.entries(viewports)) {
      await capture(page, 'agent_wallets', vpName, vp);
    }
    await context.close();

    // 3. CUSTOMER (Frontend Mock)
    console.log('Testing Customer...');
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(`${BASE_URL}/`);
    await sleep(2000);
    for (const [vpName, vp] of Object.entries(viewports)) {
      await capture(page, 'customer_home', vpName, vp);
    }
    await context.close();
    
    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

main();
