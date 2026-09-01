import { test, expect } from '@playwright/test';

test('sprint02 full flow: rebirth, attributes, daily, fair enemy', async ({ page }) => {
  const email = `e2e+${Date.now()}@example.local`;
  const password = 'E2ePass123!';

  await page.goto('http://localhost:5173/?autoCreateCharacter=1');

  // register
  await page.click('text=Register');
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await page.click('button[type=submit]');

  // wait for dashboard
  await page.waitForSelector('text=CHARACTER SHEET');

  // verify VIRGO visible in sidebar or header
  await expect(page.locator('text=Virgo').first()).toBeVisible({ timeout: 5000 });

  // verify attributes visible
  await expect(page.locator('.attribute-card').first()).toBeVisible();

  // create fair enemy if none
  const fair = await page.locator('text=No Fair Enemy for today.');
  if (await fair.count() > 0) {
    await page.fill('.create-fair input[placeholder="Name"]', 'E2E Goblin');
    await page.click('.create-fair button:has-text("Create")');
    await page.waitForSelector('text=E2E Goblin');
  }

  // fill daily checkin selects: pick DONE for first three
  const selects = await page.$$('.daily-checkin select');
  for (let i=0;i<3 && i<selects.length;i++) {
    await selects[i].selectOption('DONE');
  }
  await page.click('.daily-checkin button:has-text("Save Check-in")');
  await page.waitForTimeout(500);

  // verify momentum shown
  await expect(page.locator('text=Momentum:')).toBeVisible();

  // defeat fair enemy
  const defeatBtn = page.locator('button:has-text("Defeat")').first();
  if (await defeatBtn.count() > 0) {
    await defeatBtn.click();
    await page.waitForSelector('text=DEFEATED');
  }

  // refresh and verify persisted state
  await page.reload();
  await page.waitForSelector('text=CHARACTER SHEET');
  await expect(page.locator('.daily-checkin select').first()).toHaveValue('DONE');
  await expect(page.locator('text=DEFEATED').first()).toBeVisible();
});
