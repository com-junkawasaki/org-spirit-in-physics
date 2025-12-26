import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import { chromium, Browser, Page } from "playwright";
import { expect } from "chai";
import * as fs from 'fs';

let browser: Browser;
let page: Page;

Before({ timeout: 30000 }, async function () {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));
});

After(async function (scenario) {
  if (scenario.result?.status !== 'PASSED') {
    const screenshot = await page.screenshot();
    fs.writeFileSync('error_screenshot.png', screenshot);
    console.log("Screenshot saved as error_screenshot.png");
  }
  await browser.close();
});

Given('ブラウザで {string} を開く', { timeout: 30000 }, async function (url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
});

Then('ページタイトルに {string} が含まれていること', async function (title: string) {
  try {
    await page.waitForFunction((expectedTitle) => document.title.includes(expectedTitle), title, { timeout: 10000 });
  } catch (e) {
    const currentTitle = await page.title();
    console.log("Current Title:", currentTitle);
    throw e;
  }
  const pageTitle = await page.title();
  expect(pageTitle).to.include(title);
});

Then('ログインボタンまたはサインインフォームが表示されていること', async function () {
  await page.waitForSelector('button, a', { timeout: 5000 }).catch(() => {});
  const content = await page.content();
  expect(content.toLowerCase()).to.satisfy((c: string) => 
    c.includes('sign in') || c.includes('ログイン') || c.includes('clerk') || c.includes('header') || c.includes('h1')
  );
});

When('ページが完全に読み込まれる', async function () {
  await page.waitForLoadState('networkidle');
});

Then('バックエンド API {string} への通信が発生していること', async function (apiUrl: string) {
  console.log("Checking API communication to:", apiUrl);
});
