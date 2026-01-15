import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { page } from './navigation.js';

const BASE_URL = process.env.BASE_URL || 'https://spirit-in-physics.com';

Given('I am on the analysis page for participant {string}', async function (id: string) {
  const url = `${BASE_URL}/researcher/participants/${id}?test_mode=true`;
  console.log(`Navigating to ${url}`);
  await page.goto(url);
});

When('the timeline data is loaded', async function () {
  console.log('Waiting for timeline data to load...');
  try {
    // Wait for the spinner to disappear and data to be visible
    await page.waitForSelector('.spinner', { state: 'hidden', timeout: 45000 });
    await page.waitForSelector('.timeline-stream-container, .timeline-chart-svg', { timeout: 30000 });
    console.log('Timeline data loaded.');
  } catch (err) {
    console.log('Timeout waiting for data. Capturing debug info...');
    await page.screenshot({ path: 'bdd-failure.png' });
    const content = await page.content();
    // Log any errors from the console
    const consoleMsgs = await page.evaluate(() => {
      return (window as any)._consoleMsgs || [];
    });
    console.log('Console messages:', consoleMsgs);
    throw err;
  }
});

Then('I should see the {string} chart', async function (title: string) {
  const heading = page.locator('h3', { hasText: title });
  await expect(heading).toBeVisible();
  await expect(page.locator('svg.timeline-chart-svg')).toBeVisible();
});

Then('I should see the KPI cards for reaction metrics', async function () {
  await expect(page.locator('.kpi-card')).toHaveCount(4);
  await expect(page.locator('text=平均反応時間')).toBeVisible();
});

Then('I should see potential {string} highlights on the timeline', async function (label: string) {
  // Check for analysis overlay text
  const gapText = page.locator('text=Potential Gap');
  // Since it's an overlay that might not always appear depending on data, 
  // we check if the element exists in the DOM if we expect it for this specific ID
  await expect(gapText.first()).toBeVisible();
});

When('I switch to the {string} tab', async function (tabName: string) {
  const tabButton = page.locator('button', { hasText: tabName });
  console.log(`Clicking tab button: "${tabName}"`);
  await expect(tabButton).toBeVisible();
  await tabButton.click({ force: true });
  console.log('Clicked tab button');
  // Wait for the button to become active (check for shadow-sm class which is applied when active)
  await expect(tabButton).toHaveClass(/shadow-sm/, { timeout: 5000 });
  await page.waitForTimeout(1000); // Wait for transition
});

Then('I should see the 3D Force Graph', async function () {
  // Wait longer for 3D canvas initialization
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
});

Then('I should see the {string} panel with analysis results', async function (panelTitle: string) {
  const heading = page.locator('h3', { hasText: panelTitle });
  await expect(heading).toBeVisible();
  // Check that at least one analysis item is visible
  await expect(page.locator('.analysis-item').first()).toBeVisible();
});

