// Merkle DAG: e2e.homepage.spec
// TDD E2E tests for homepage

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main title', async ({ page }) => {
    // Green: Fix test to match actual HTML structure
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();
    await expect(title).toContainText('Spirit in Physics');
  });

  test('should display "Unified Platform" subtitle', async ({ page }) => {
    // Green: Fix test to match actual HTML structure
    const subtitle = page.getByText('Unified Platform');
    await expect(subtitle).toBeVisible();
  });

  test('should have four main navigation cards', async ({ page }) => {
    // Green: Fix test to match actual HTML structure
    // Cards are links with h2 headings inside - use href to find them
    const demoCard = page.locator('a[href="/demo"]');
    const paperCard = page.locator('a[href="/paper"]');
    const participantCard = page.locator('a[href="/participant"]');
    const researcherCard = page.locator('a[href="/researcher"]');

    await expect(demoCard).toBeVisible();
    await expect(paperCard).toBeVisible();
    await expect(participantCard).toBeVisible();
    await expect(researcherCard).toBeVisible();
  });

  test('should navigate to demo page when clicking demo card', async ({ page }) => {
    // Green: Fix test to match actual HTML structure
    const demoCard = page.locator('a[href="/demo"]');
    await demoCard.click();
    
    await expect(page).toHaveURL(/\/demo/);
  });

  test('should navigate to paper page when clicking paper card', async ({ page }) => {
    // Green: Fix test to match actual HTML structure
    const paperCard = page.locator('a[href="/paper"]');
    await paperCard.click();
    
    await expect(page).toHaveURL(/\/paper/);
  });

  test('should navigate to participant page when clicking participant card', async ({ page }) => {
    // Green: Fix test to match actual HTML structure
    const participantCard = page.locator('a[href="/participant"]');
    await participantCard.click();
    
    await expect(page).toHaveURL(/\/participant/);
  });

  test('should navigate to researcher page when clicking researcher card', async ({ page }) => {
    // Green: Fix test to match actual HTML structure
    const researcherCard = page.locator('a[href="/researcher"]');
    await researcherCard.click();
    
    await expect(page).toHaveURL(/\/researcher/);
  });
});

