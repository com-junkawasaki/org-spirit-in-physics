// Merkle DAG: e2e.responsive.spec
// TDD E2E tests for responsive design

import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('homepage should be responsive on mobile', async ({ page }) => {
    // Green: Test responsive design - mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    // Check that content is visible on mobile
    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
  });

  test('homepage should be responsive on tablet', async ({ page }) => {
    // Green: Test responsive design - tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('homepage should be responsive on desktop', async ({ page }) => {
    // Green: Test responsive design - desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop size
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

