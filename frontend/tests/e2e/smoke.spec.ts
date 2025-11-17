import { test, expect } from '@playwright/test';

test('dashboard renders headline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('TL;DR tygodnia')).toBeVisible();
});
