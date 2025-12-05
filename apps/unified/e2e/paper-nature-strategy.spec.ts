// Merkle DAG: e2e.paper-nature-strategy.spec
// TDD E2E tests for nature-strategy paper page

import { test, expect } from '@playwright/test';

test.describe('Nature Strategy Paper Page', () => {
  test('should navigate to nature-strategy paper page', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/paper/nature-strategy');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/paper\/nature-strategy/);
  });

  test('should display nature-strategy paper page content', async ({ page }) => {
    // Green: Test paper page loads
    await page.goto('/paper/nature-strategy');
    await page.waitForLoadState('networkidle');
    
    // Paper page should have research content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have paper title visible', async ({ page }) => {
    // Green: Test paper title is displayed
    await page.goto('/paper/nature-strategy');
    await page.waitForLoadState('networkidle');
    
    // Check for heading (paper title)
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('should have research paper structure', async ({ page }) => {
    // Green: Test paper has proper structure
    await page.goto('/paper/nature-strategy');
    await page.waitForLoadState('networkidle');
    
    // Paper should have some content structure
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

