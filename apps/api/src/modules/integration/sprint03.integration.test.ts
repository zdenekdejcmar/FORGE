import { afterAll, beforeAll, expect, test } from 'vitest';
import { buildApp } from '../../app.js';

let app: Awaited<ReturnType<typeof buildApp>>;

async function request(
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
) {
  const response = await app.inject({
    method: (init.method ?? 'GET') as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE',
    url: path,
    headers: init.headers,
    payload: init.body,
  });

  let body: any = {};
  try {
    body = response.json();
  } catch {
    // ignore
  }

  return { status: response.statusCode, body };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

test('sprint03 integration - complete day idempotent and attribute xp', async () => {
  const email = `int+${Date.now()}@example.local`;
  const password = 'TestPass123!';

  // register
  let r = await request('/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expect(r.status).toBe(201);
  const token = r.body.token;
  expect(token).toBeDefined();

  // create character
  r = await request('/character', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'INTCHAR' }),
  });
  expect(r.status).toBe(201);

  // progress before
  r = await request('/progress/character', { headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  const beforeTotal = r.body.totalXp ?? 0;

  // post daily checkin with valid domain keys
  const states: Record<string, string> = {
    SLEEP: 'DONE',
    QUALITY_FOOD: 'DONE',
    HYGIENE: 'DONE',
  };

  r = await request('/daily/checkin', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ states }),
  });
  expect([200, 201]).toContain(r.status);

  // complete day
  r = await request('/daily/complete', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  const resolution = r.body;
  expect(resolution).toHaveProperty('totalXp');
  expect(resolution.totalXp).toBeGreaterThanOrEqual(0);

  // progress after
  r = await request('/progress/character', { headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  const afterTotal = r.body.totalXp ?? 0;
  expect(afterTotal).toBeGreaterThanOrEqual(beforeTotal + resolution.totalXp);

  // complete again (idempotent)
  r = await request('/daily/complete', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  const resolution2 = r.body;
  expect(resolution2.totalXp).toBe(resolution.totalXp);

  // progress remains same
  r = await request('/progress/character', { headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  const afterTotal2 = r.body.totalXp ?? 0;
  expect(afterTotal2).toBe(afterTotal);
});
