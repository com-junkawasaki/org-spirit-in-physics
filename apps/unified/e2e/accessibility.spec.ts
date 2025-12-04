// Merkle DAG: e2e.accessibility.spec
// TDD E2E tests for accessibility

import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('homepage should have proper heading hierarchy', async ({ page }) => {
    // Green: Test accessibility - heading hierarchy
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('homepage should have accessible links', async ({ page }) => {
    // Green: Test accessibility - links should be accessible
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const links = page.locator('a[href]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    
    // Check first link has href
    const firstLink = links.first();
    const href = await firstLink.getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('pages should have proper page titles', async ({ page }) => {
    // Green: Test accessibility - page titles
    const pages = ['/', '/demo', '/paper', '/participant', '/researcher'];
    
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    }
  });
});

