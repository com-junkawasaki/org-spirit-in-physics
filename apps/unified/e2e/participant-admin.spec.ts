// Merkle DAG: e2e.participant-admin.spec
// TDD E2E tests for participant admin page

import { test, expect } from '@playwright/test';

test.describe('Participant Admin Page', () => {
  test('should navigate to admin page from participant page', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/participant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
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

  test('should display admin page', async ({ page }) => {
    // Green: Test admin page loads
    await page.goto('/participant/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Admin page should have main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have admin page title or heading', async ({ page }) => {
    // Green: Test admin page has title
    await page.goto('/participant/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for heading or title
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

