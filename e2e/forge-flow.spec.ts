import { test, expect } from '@playwright/test';

test('registration, onboarding, quest completion, and persisted progression all work', async ({ page }) => {
  const email = `player-${Date.now()}@forge.test`;
  const password = 'Password123!';
  const characterName = 'Astra';
  const arenaName = 'Core Forge';
  const questTitle = 'Ship the first FORGE vertical slice';

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('heading', { name: 'Forge your first identity' })).toBeVisible();

  await page.getByLabel('Name').fill(characterName);
  await page.getByRole('button', { name: 'Create Character' }).click();

  await page.getByLabel('Primary Arena').fill(arenaName);
  await page.getByLabel('First Quest').fill(questTitle);
  await page.getByRole('button', { name: 'Create First Quest' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('h1')).toContainText(characterName);

  await expect(page.getByRole('button', { name: 'Complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete' }).click();

  await expect(page.locator('strong').filter({ hasText: '50' })).toBeVisible();
  await expect(page.locator('text=Lv 1')).toBeVisible();

  await expect(page.getByText('Active Quests')).toBeVisible();
  await page.reload();

  await expect(page.locator('h1')).toContainText(characterName);
  await expect(page.locator('strong').filter({ hasText: '50' })).toBeVisible();
});
