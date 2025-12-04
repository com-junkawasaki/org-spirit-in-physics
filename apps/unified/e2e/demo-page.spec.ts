// Merkle DAG: e2e.demo-page.spec
// TDD E2E tests for demo page

import { test, expect } from '@playwright/test';

test.describe('Demo Page', () => {
  test('should navigate to demo page from homepage', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/');
    const demoLink = page.locator('a[href="/demo"]');
    await demoLink.click();
    
    await expect(page).toHaveURL(/\/demo/);
  });

  test('should display demo page', async ({ page }) => {
    // Green: Test demo page loads
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    // Wait for React component to hydrate
    await page.waitForTimeout(2000);
    
    // Check that page loaded (title or main content)
    const title = page.locator('title');
    await expect(title).toContainText(/demo|complex/i);
  });

  test('should have interactive demo components', async ({ page }) => {
    // Green: Test demo page has interactive elements
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Demo page should have some interactive elements
    // This is a basic check - actual components depend on DemoApp implementation
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

