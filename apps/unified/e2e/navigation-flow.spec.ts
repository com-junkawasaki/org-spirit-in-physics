// Merkle DAG: e2e.navigation-flow.spec
// TDD E2E tests for complete navigation flow

import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test('should complete full navigation cycle', async ({ page }) => {
    // Green: Test complete navigation flow
    // Start at homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
    
    // Navigate to demo
    const demoLink = page.locator('a[href="/demo"]');
    await demoLink.waitFor({ state: 'visible' });
    await demoLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/demo/);
    
    // Navigate back to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
    
    // Navigate to paper
    const paperLink = page.locator('a[href="/paper"]');
    await paperLink.waitFor({ state: 'visible' });
    await paperLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/paper/);
    
    // Navigate back to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
    
    // Navigate to participant
    const participantLink = page.locator('a[href="/participant"]');
    await participantLink.waitFor({ state: 'visible' });
    await participantLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/participant/);
    
    // Navigate back to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
    
    // Navigate to researcher
    const researcherLink = page.locator('a[href="/researcher"]');
    await researcherLink.waitFor({ state: 'visible' });
    await researcherLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/researcher/);
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Green: Test that navigation doesn't break page state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const initialTitle = await page.title();
    
    const demoLink = page.locator('a[href="/demo"]');
    await demoLink.waitFor({ state: 'visible' });
    await demoLink.click();
    await page.waitForLoadState('networkidle');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const finalTitle = await page.title();
    expect(finalTitle).toBe(initialTitle);
  });
});

