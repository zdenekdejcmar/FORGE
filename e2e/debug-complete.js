const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', (req) => {
    if (req.url().includes('/complete')) {
      console.log('Request:', req.method(), req.url());
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/complete')) {
      console.log('Response status:', res.status());
      try {
        const body = await res.json();
        console.log('Response body:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('Response body not JSON or failed to parse');
      }
    }
  });

  const email = `player-${Date.now()}@forge.test`;
  const password = 'Password123!';
  const characterName = 'Astra';
  const arenaName = 'Core Forge';
  const questTitle = 'Ship the first FORGE vertical slice';

  const base = 'http://localhost:5174';

  await page.goto(`${base}/register`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Create account")');

  await page.waitForURL('**/onboarding');

  await page.fill('input[aria-label="Name"], input[name="Name"], label:has-text("Name") input', characterName).catch(()=>{});
  // attempt multiple selectors
  await page.fill('input[placeholder="Name"]', characterName).catch(()=>{});
  // fallback: find by label text
  await page.locator('label:has-text("Name") input').fill(characterName);
  await page.click('button:has-text("Create Character")');

  await page.fill('input[aria-label="Primary Arena"], label:has-text("Primary Arena") input', arenaName).catch(()=>{});
  await page.fill('input[aria-label="First Quest"], label:has-text("First Quest") input', questTitle).catch(()=>{});
  await page.click('button:has-text("Create First Quest")');

  await page.waitForURL('**/');
  await page.waitForSelector('button:has-text("Complete")');

  // Click and wait for the /complete response
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/complete')),
    page.click('button:has-text("Complete")'),
  ]);

  console.log('Got response status', response.status());
  try {
    const json = await response.json();
    console.log('Complete response JSON:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('Could not parse response JSON', e.message);
  }

  await browser.close();
  process.exit(0);
})();
