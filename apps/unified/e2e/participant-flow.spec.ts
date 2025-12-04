// Merkle DAG: e2e.participant-flow.spec
// TDD E2E tests for participant flow

import { test, expect } from '@playwright/test';

test.describe('Participant Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/participant');
    // Wait for React components to hydrate (client:load)
    await page.waitForLoadState('networkidle');
    // Wait for React hydration - Button components use client:load
    // Give extra time for React to hydrate
    await page.waitForTimeout(3000);
  });

  test('should display participant landing page', async ({ page }) => {
    // Green: Fix test - check page loaded successfully
    // Page should have title or heading
    const title = page.getByRole('heading', { level: 1 }).or(page.locator('h1'));
    await expect(title.first()).toBeVisible({ timeout: 10000 });
    const titleText = await title.first().textContent();
    expect(titleText).toContain('Spirit in Physics');
  });

  test('should have sign-in button', async ({ page }) => {
    // Green: Fix test - Button is inside link, wait for React hydration
    // The link wraps a Button component, so we check for the link
    const signInLink = page.locator('a[href="/participant/sign-in"]');
    // Wait for React to hydrate and render the button
    await page.waitForFunction(
      () => {
        const link = document.querySelector('a[href="/participant/sign-in"]');
        return link && link.textContent?.includes('サインイン');
      },
      { timeout: 20000 }
    );
    await expect(signInLink).toBeVisible();
  });

  test('should have admin button', async ({ page }) => {
    // Green: Fix test - wait for React hydration
    const adminLink = page.locator('a[href="/participant/admin"]');
    await page.waitForFunction(
      () => {
        const link = document.querySelector('a[href="/participant/admin"]');
        return link && link.textContent?.includes('管理者');
      },
      { timeout: 20000 }
    );
    await expect(adminLink).toBeVisible();
  });

  test('should have participant test button', async ({ page }) => {
    // Green: Fix test - wait for React hydration
    const testLink = page.locator('a[href="/participant/steps/1"]');
    await page.waitForFunction(
      () => {
        const link = document.querySelector('a[href="/participant/steps/1"]');
        return link && link.textContent?.includes('被験者');
      },
      { timeout: 20000 }
    );
    await expect(testLink).toBeVisible();
  });

  test('should navigate to sign-in page when clicking sign-in button', async ({ page }) => {
    // Green: Fix test - wait for React hydration then click
    const signInLink = page.locator('a[href="/participant/sign-in"]');
    await page.waitForFunction(
      () => {
        const link = document.querySelector('a[href="/participant/sign-in"]');
        return link && link.textContent?.includes('サインイン');
      },
      { timeout: 20000 }
    );
    await signInLink.click();
    
    await expect(page).toHaveURL(/\/participant\/sign-in/, { timeout: 10000 });
  });

  test('should navigate to admin page when clicking admin button', async ({ page }) => {
    // Green: Fix test - wait for React hydration then click
    const adminLink = page.locator('a[href="/participant/admin"]');
    await page.waitForFunction(
      () => {
        const link = document.querySelector('a[href="/participant/admin"]');
        return link && link.textContent?.includes('管理者');
      },
      { timeout: 20000 }
    );
    await adminLink.click();
    
    await expect(page).toHaveURL(/\/participant\/admin/, { timeout: 10000 });
  });

  test('should navigate to test page when clicking participant test button', async ({ page }) => {
    // Green: Fix test - wait for React hydration then click
    const testLink = page.locator('a[href="/participant/steps/1"]');
    await page.waitForFunction(
      () => {
        const link = document.querySelector('a[href="/participant/steps/1"]');
        return link && link.textContent?.includes('被験者');
      },
      { timeout: 20000 }
    );
    await testLink.click();
    
    await expect(page).toHaveURL(/\/participant\/steps\/1/, { timeout: 10000 });
  });
});

