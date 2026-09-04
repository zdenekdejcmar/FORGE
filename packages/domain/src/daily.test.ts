import { describe, expect, it } from 'vitest';
import { DAILY_DOMAINS, DOMAIN_TO_ATTRIBUTES, computeMomentumFromDay } from './index';

describe('daily domain configuration', () => {
  it('exports the canonical 13 daily domains', () => {
    expect(DAILY_DOMAINS.length).toBe(13);
    expect(DAILY_DOMAINS).toContain('SEXUAL_DISCIPLINE');
    expect(DAILY_DOMAINS).toContain('REFLECTION_SILENCE');
  });

  it('maps domains to attributes', () => {
    const mapping = DOMAIN_TO_ATTRIBUTES['SLEEP'];
    expect(mapping).toBeDefined();
    expect(mapping).toContain('HEALTH');
  });
});

describe('momentum from day states', () => {
  it('increases momentum for a clearly good day', () => {
    const prev = 0;
    const states = { SLEEP: 'DONE', QUALITY_FOOD: 'DONE' } as any;
    const next = computeMomentumFromDay(prev, states);
    expect(next).toBeGreaterThanOrEqual(prev);
  });

  it('decreases momentum for a chaotic day with missed domains', () => {
    const prev = 2;
    const states = { SLEEP: 'MISSED', QUALITY_FOOD: 'MISSED' } as any;
    const next = computeMomentumFromDay(prev, states);
    expect(next).toBeLessThan(prev);
  });
});
