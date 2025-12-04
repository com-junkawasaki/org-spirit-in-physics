// Merkle DAG: e2e.researcher-page.spec
// TDD E2E tests for researcher page

import { test, expect } from '@playwright/test';

test.describe('Researcher Page', () => {
  test('should navigate to researcher page from homepage', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/');
    const researcherLink = page.locator('a[href="/researcher"]');
    await researcherLink.click();
    
    await expect(page).toHaveURL(/\/researcher/);
  });

  test('should display researcher dashboard', async ({ page }) => {
    // Green: Test researcher page loads
    await page.goto('/researcher');
    await page.waitForLoadState('networkidle');
    // Wait for React components to hydrate
    await page.waitForTimeout(2000);
    
    // Researcher page should have dashboard content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have researcher page title', async ({ page }) => {
    // Green: Test researcher page has title
    await page.goto('/researcher');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for heading or title
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });
});

