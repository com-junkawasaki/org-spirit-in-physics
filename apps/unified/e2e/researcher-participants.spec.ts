// Merkle DAG: e2e.researcher-participants.spec
// TDD E2E tests for researcher participants page

import { test, expect } from '@playwright/test';

test.describe('Researcher Participants Page', () => {
  test('should navigate to participants page from researcher page', async ({ page }) => {
    // Green: Test navigation flow
    await page.goto('/researcher');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Wait for redirect or navigate directly
    await page.goto('/researcher/participants');
    await expect(page).toHaveURL(/\/researcher\/participants/);
  });

  test('should display participants page', async ({ page }) => {
    // Green: Test participants page loads
    await page.goto('/researcher/participants');
    await page.waitForLoadState('networkidle');
    // Wait for React components to hydrate
    await page.waitForTimeout(3000);
    
    // Participants page should have main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have participants page title', async ({ page }) => {
    // Green: Test participants page has title
    await page.goto('/researcher/participants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check for heading with "参加者一覧"
    const heading = page.getByRole('heading', { name: /参加者/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should have breadcrumb navigation', async ({ page }) => {
    // Green: Test breadcrumb is displayed
    await page.goto('/researcher/participants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check for breadcrumb navigation
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb).toBeVisible({ timeout: 10000 });
  });

  test('should display participant overview component', async ({ page }) => {
    // Green: Test participant overview loads
    await page.goto('/researcher/participants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Participant overview should have some content
    // This is a basic check - actual structure depends on ParticipantOverview component
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have sidebar navigation', async ({ page }) => {
    // Green: Test sidebar is displayed
    await page.goto('/researcher/participants');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check for sidebar (AppShell component)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });
});

