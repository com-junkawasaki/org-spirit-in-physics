import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, Page, expect } from '@playwright/test';

// Increase timeout for complex visualizations
setDefaultTimeout(60000);

export let browser: Browser;
export let page: Page;

Before(async function () {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  
  // Capture console logs
  await page.addInitScript(() => {
    (window as any)._consoleMsgs = [];
    const push = (type: string, args: any[]) => {
      (window as any)._consoleMsgs.push({ type, text: args.map(a => String(a)).join(' ') });
    };
    const originalLog = console.log;
    console.log = (...args) => { push('log', args); originalLog(...args); };
    const originalError = console.error;
    console.error = (...args) => { push('error', args); originalError(...args); };
    const originalWarn = console.warn;
    console.warn = (...args) => { push('warn', args); originalWarn(...args); };
  });
});

After(async function () {
  if (browser) {
    await browser.close();
  }
});

Given('I am on the researcher dashboard', async function () {
  await page.goto('http://spirit.localhost/researcher');
});

Given('I see a list of participants', async function () {
  // Wait for the participant list to be visible
  await page.waitForSelector('.participants-table');
});

When('I click on a participant ID {string}', async function (id: string) {
  const link = page.locator(`a:has-text("${id}")`);
  await link.click();
});

Then('I should be navigated to the analysis page for {string}', async function (id: string) {
  await page.waitForURL(`**/researcher/participants/${id}`);
  const url = page.url();
  if (!url.includes(`/researcher/participants/${id}`)) {
    throw new Error(`Expected to be on analysis page for ${id}, but was on ${url}`);
  }
});

Then('I should see the timeline visualization', async function () {
  // Check for the visualization component
  await page.waitForSelector('.timeline-visualization-container');
});

