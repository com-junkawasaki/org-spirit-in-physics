import { test, expect } from '@playwright/test';

test.describe('UX Debugging', () => {
  test('should render the full page correctly and be interactive', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Interact with the consent form
    await page.locator('label[for="terms"]').click();
    await expect(page.getByRole('button', { name: 'Consent and Continue' })).toBeEnabled();
    await page.getByRole('button', { name: 'Consent and Continue' }).click();

    // Check visibility of key sections
    await expect(page.getByRole('heading', { name: 'Spirit in Physics ( Jung\'s Word Association Test Embedding Model )' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vectorization Spirit Using the Word Association Experiment (Jung, 1910)' })).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'tests/screenshots/ux-debug.png', fullPage: true });

    // Verify interactivity of a key component (e.g., a slider in the Kawasaki Model)
    const alphaSlider = page.locator('input[type="range"][name="alpha"]');
    if (await alphaSlider.isVisible()) {
      const initialValue = await alphaSlider.inputValue();
      await alphaSlider.fill('0.5');
      const newValue = await alphaSlider.inputValue();
      expect(newValue).not.toBe(initialValue);
    }

    // Assert that no console errors were thrown
    expect(consoleErrors).toEqual([]);
  });
}); 