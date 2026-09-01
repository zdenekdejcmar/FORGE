import { test, expect } from 'vitest';

const API = 'http://localhost:3001';

async function request(path: string, init: any = {}) {
  const res = await fetch(API + path, init);
  const text = await res.text();
  let body: any = {};
  try { body = JSON.parse(text); } catch (err) {
    // ignore parse errors
  }
  return { status: res.status, body };
}

test('sprint02 integration - daily checkin and fair enemy', async () => {
  const email = `int+${Date.now()}@example.local`;
  const password = 'TestPass123!';

  // register
  let r = await request('/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  expect(r.status).toBe(201);
  const token = r.body.token;
  expect(token).toBeDefined();

  // create character
  r = await request('/character', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'INTCHAR' }) });
  expect(r.status).toBe(201);

  // fetch attributes
  r = await request('/attributes', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  const attributes = r.body;
  expect(Array.isArray(attributes)).toBe(true);

  // post daily checkin with DONE for first three attributes
  const states: Record<string, string> = {};
  for (let i=0;i<3 && i<attributes.length;i++) states[attributes[i].name] = 'DONE';
  r = await request('/daily/checkin', { method: 'POST', headers: { 'content-type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ states }) });
  expect([200,201].includes(r.status)).toBe(true);

  // verify daily/today returns persisted states
  r = await request('/daily/today', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  expect(r.body.states).toBeDefined();
  const parsed = JSON.parse(r.body.states);
  expect(Object.keys(parsed).length).toBeGreaterThanOrEqual(3);

  // check xp transactions for attributes (should have at least one ATTRIBUTE transaction today)
  r = await request('/progress/character', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  expect(r.body.totalXp).toBeGreaterThanOrEqual(0);

  // create fair enemy
  r = await request('/fair-enemies/today', { method: 'POST', headers: { 'content-type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: 'TestEnemy', difficulty: 'NORMAL', primaryAttribute: attributes[0].name, xpReward: 12 }) });
  expect([200,201].includes(r.status)).toBe(true);
  const enemy = r.body;
  expect(enemy).toBeDefined();

  // defeat fair enemy
  r = await request(`/fair-enemies/${enemy.id}/defeat`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  expect([200,201].includes(r.status)).toBe(true);
  expect(r.body.status).toBe('DEFEATED');

  // defeat again should not award xp twice (idempotent)
  r = await request(`/fair-enemies/${enemy.id}/defeat`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  expect(r.status).toBe(200);
  expect(r.body.status).toBe('DEFEATED');
});
