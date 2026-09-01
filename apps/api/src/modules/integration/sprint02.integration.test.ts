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
    // Ignore non-JSON responses.
  }

  return {
    status: response.statusCode,
    body,
  };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

test('sprint02 integration - daily checkin and fair enemy', async () => {
  const email = `int+${Date.now()}@example.local`;
  const password = 'TestPass123!';

  // register
  let r = await request('/auth/register', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  expect(r.status).toBe(201);

  const token = r.body.token;
  expect(token).toBeDefined();

  // create character
  r = await request('/character', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'INTCHAR',
    }),
  });

  expect(r.status).toBe(201);

  // fetch attributes
  r = await request('/attributes', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(r.status).toBe(200);

  const attributes = r.body;

  expect(Array.isArray(attributes)).toBe(true);
  expect(attributes.length).toBeGreaterThanOrEqual(3);

  // post daily checkin with DONE for first three attributes
  const states: Record<string, string> = {};

  for (let i = 0; i < 3; i += 1) {
    states[attributes[i].name] = 'DONE';
  }

  r = await request('/daily/checkin', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      states,
    }),
  });

  expect([200, 201]).toContain(r.status);

  // verify daily/today returns persisted states
  r = await request('/daily/today', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(r.status).toBe(200);
  expect(r.body.states).toBeDefined();

  const parsed =
    typeof r.body.states === 'string'
      ? JSON.parse(r.body.states)
      : r.body.states;

  expect(Object.keys(parsed).length).toBeGreaterThanOrEqual(3);

  // verify character progression endpoint still works
  r = await request('/progress/character', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(r.status).toBe(200);
  expect(r.body.totalXp).toBeGreaterThanOrEqual(0);

  // create fair enemy
  r = await request('/fair-enemies/today', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'TestEnemy',
      difficulty: 'NORMAL',
      primaryAttribute: attributes[0].name,
      xpReward: 12,
    }),
  });

  expect([200, 201]).toContain(r.status);

  const enemy = r.body;

  expect(enemy).toBeDefined();
  expect(enemy.id).toBeDefined();

  // defeat fair enemy
  r = await request(`/fair-enemies/${enemy.id}/defeat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect([200, 201]).toContain(r.status);
  expect(r.body.status).toBe('DEFEATED');

  // defeat again should not award XP twice
  r = await request(`/fair-enemies/${enemy.id}/defeat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(r.status).toBe(200);
  expect(r.body.status).toBe('DEFEATED');
});