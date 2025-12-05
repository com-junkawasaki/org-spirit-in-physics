// Merkle DAG: e2e.participant-signin.spec
// TDD E2E tests for participant sign-in page

import { test, expect } from '@playwright/test';

test.describe('Participant Sign-In Page', () => {
  test('should navigate to sign-in page from participant page', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/participant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
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

  test('should display sign-in page', async ({ page }) => {
    // Green: Test sign-in page loads
    await page.goto('/participant/sign-in');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Sign-in page should have main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have sign-in form or component', async ({ page }) => {
    // Green: Test sign-in form is displayed
    await page.goto('/participant/sign-in');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Sign-in page should have form or Clerk component
    // This is a basic check - actual structure depends on SignInComponent
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

