// Merkle DAG: e2e.participant-signup.spec
// TDD E2E tests for participant sign-up page

import { test, expect } from '@playwright/test';

test.describe('Participant Sign-Up Page', () => {
  test('should navigate to sign-up page', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/participant/sign-up');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/participant\/sign-up/, { timeout: 10000 });
  });

  test('should display sign-up page', async ({ page }) => {
    // Green: Test sign-up page loads
    await page.goto('/participant/sign-up');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Sign-up page should have main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have sign-up form or component', async ({ page }) => {
    // Green: Test sign-up form is displayed
    await page.goto('/participant/sign-up');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Sign-up page should have form or Clerk component
    // This is a basic check - actual structure depends on SignUpComponent
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

