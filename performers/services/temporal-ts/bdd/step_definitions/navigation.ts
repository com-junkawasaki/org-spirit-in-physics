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

Given('I am on the researcher dashboard', async function () {
  await page.goto('http://spirit.localhost/researcher/participants?test_mode=true');
  await page.waitForSelector('.participant-list-container', { timeout: 15000 });
});

Given('I am on the researcher dashboard with test mode enabled', async function () {
  await page.goto('http://spirit.localhost/researcher/participants?test_mode=true');
  await page.waitForSelector('.participant-list-container', { timeout: 15000 });
});

Given('I see a list of participants', async function () {
  await page.waitForSelector('.participants-table', { timeout: 15000 });
});

When('I click on a participant ID {string}', async function (id: string) {
  const link = page.locator(`a:has-text("${id}")`);
  if (await link.isVisible()) {
    await link.click();
  } else {
    // If specific ID not found, click the first participant ID link
    await page.locator('a.id-text').first().click();
  }
});

Then('I should be navigated to the analysis page for {string}', async function (id: string) {
  await expect(page).toHaveURL(new RegExp(`.*\/participants\/.*`), { timeout: 15000 });
});

Then('I should see the timeline visualization', async function () {
  await page.waitForSelector('.timeline-visualization-container', { timeout: 30000 });
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

