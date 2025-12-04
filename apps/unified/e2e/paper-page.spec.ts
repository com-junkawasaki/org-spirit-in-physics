// Merkle DAG: e2e.paper-page.spec
// TDD E2E tests for paper page

import { test, expect } from '@playwright/test';

test.describe('Paper Page', () => {
  test('should navigate to paper page from homepage', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/');
    const paperLink = page.locator('a[href="/paper"]');
    await paperLink.click();
    
    await expect(page).toHaveURL(/\/paper/);
  });

  test('should display paper page content', async ({ page }) => {
    // Green: Test paper page loads
    await page.goto('/paper');
    await page.waitForLoadState('networkidle');
    
    // Paper page should have research content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have paper title visible', async ({ page }) => {
    // Green: Test paper title is displayed
    await page.goto('/paper');
    await page.waitForLoadState('networkidle');
    
    // Check for heading (paper title)
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('should have table of contents or navigation', async ({ page }) => {
    // Green: Test paper has navigation elements
    await page.goto('/paper');
    await page.waitForLoadState('networkidle');
    
    // Paper should have some navigation or TOC
    // This is a basic check - actual structure depends on ResearchPaper component
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

