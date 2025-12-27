import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, Page, expect } from '@playwright/test';

setDefaultTimeout(60 * 1000);

let browser: Browser;
let page: Page;

Before(async function () {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
});

After(async function () {
  await browser.close();
});

Given('I am on the researcher dashboard with test mode enabled', async function () {
  await page.goto('http://spirit.localhost/researcher?test_mode=true');
  // Verify bypass worked
  await page.waitForSelector('.dashboard-layout');
});

When('I navigate directly to the analysis page for {string}', async function (id: string) {
  await page.goto(`http://spirit.localhost/researcher/participants/${id}?test_mode=true`);
});

Then('I should see the participant ID {string} in the header', async function (id: string) {
  const header = page.locator('p.text-sm.font-mono');
  await expect(header).toContainText(id, { timeout: 15000 });
});

Then('I should see the timeline visualization container', async function () {
  await page.waitForSelector('.timeline-visualization-container', { timeout: 30000 });
});

