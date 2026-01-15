import { Given, When, Then, Before, After, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, Browser, Page, expect } from '@playwright/test';

// Increase timeout for complex visualizations
setDefaultTimeout(60000);

const BASE_URL = process.env.BASE_URL || 'https://spirit-in-physics.com';

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

After(async function (scenario) {
  if (scenario.result?.status === Status.FAILED && page) {
    const consoleMsgs = await page.evaluate(() => {
      return (window as any)._consoleMsgs || [];
    });
    console.log('Console messages:', consoleMsgs);
    await page.screenshot({ path: 'bdd-failure.png' });
  }
  if (browser) {
    await browser.close();
  }
});

Given('I am on the researcher dashboard', async function () {
  await page.goto(`${BASE_URL}/researcher/participants?test_mode=true`);
});

Given('I see a list of participants', async function () {
  console.log(`Current URL: ${page.url()}`);
  
  // Check for auth requirement
  if (await page.isVisible('.auth-required') || await page.isVisible('.cl-signIn-root')) {
    throw new Error('Authentication is required. Test mode bypass failed.');
  }

  // Check for error state
  if (await page.isVisible('.error-state')) {
    const errorText = await page.innerText('.error-state');
    throw new Error(`Page is in error state: ${errorText}`);
  }
  
  // Wait for loading to finish (max 10s)
  try {
    await page.waitForSelector('.loading-state', { state: 'hidden', timeout: 10000 });
  } catch (e) {
    console.log('Loading state did not disappear');
  }

  // Wait for the participant list to be visible
  try {
    await page.waitForSelector('.participants-table', { timeout: 10000 });
  } catch (e) {
    console.log('Failed to find .participants-table');
    await page.screenshot({ path: 'bdd-nav-failure.png' });
    const content = await page.content();
    console.log('Page content length:', content.length);
    // console.log('Page content:', content); // Too verbose
    throw e;
  }
});

When('I click on a participant ID {string}', async function (id: string) {
  const link = page.locator(`a:has-text("${id}")`);
  await link.click();
});

Then('I should be navigated to the analysis page for {string}', async function (id: string) {
  // Allow optional trailing slash and query params
  const pattern = new RegExp(`/researcher/participants/${id}/?`);
  await page.waitForURL(pattern, { timeout: 30000 });
  const url = page.url();
  if (!url.includes(`/researcher/participants/${id}`)) {
    throw new Error(`Expected to be on analysis page for ${id}, but was on ${url}`);
  }
});

Then('I should see the timeline visualization', async function () {
  // Check for the visualization component
  await page.waitForSelector('.timeline-visualization-container');
});
