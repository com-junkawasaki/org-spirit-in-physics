// Merkle DAG: e2e.demo-test.spec
// TDD E2E tests for demo test page

import { test, expect } from '@playwright/test';

test.describe('Demo Test Page', () => {
  test('should navigate to demo test page', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/demo/test');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/demo\/test/);
  });

  test('should display demo test page', async ({ page }) => {
    // Green: Test demo test page loads
    await page.goto('/demo/test');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Demo test page should have main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have demo test page title', async ({ page }) => {
    // Green: Test demo test page has title
    await page.goto('/demo/test');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for heading or title
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

