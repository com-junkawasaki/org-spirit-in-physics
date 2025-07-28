import { test, expect } from '@playwright/test';

test.describe('Main Page Debugging', () => {
  test('should load the main page without console errors after consent', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Agree to consent form
    await page.locator('label[for="terms"]').click();
    
    // Wait for the button to be enabled
    await expect(page.getByRole('button', { name: 'Submit and Continue' })).toBeEnabled();
    
    await page.getByRole('button', { name: 'Submit and Continue' }).click();
    
    // Wait for the main content to be visible
    await expect(page.getByRole('heading', { name: 'Introduction' })).toBeVisible();

    // Check if there were any console errors
    expect(consoleErrors).toEqual([]);
  });
}); 