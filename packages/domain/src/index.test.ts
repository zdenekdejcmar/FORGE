import { describe, expect, it } from 'vitest';
import {
  calculateLevelProgress,
  getLevelFromXp,
  getXpProgressForLevel,
  xpRequiredForLevel,
  applyDiminishingReturns,
  computeMomentum,
  fairEnemyXp,
  computeRebirthMultiplier,
} from './index';

describe('progression domain rules', () => {
  it('starts at level 1 with no negative progress', () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getXpProgressForLevel(0)).toMatchObject({
      level: 1,
      totalXp: 0,
      xpIntoLevel: 0,
      xpRemaining: xpRequiredForLevel(2),
      progressPercent: 0,
    });
    expect(calculateLevelProgress(0)).toMatchObject({
      level: 1,
      totalXp: 0,
      xpIntoLevel: 0,
      xpRemaining: xpRequiredForLevel(2),
      progressPercent: 0,
    });
  });

  it('levels up only when the next threshold is reached', () => {
    expect(getLevelFromXp(xpRequiredForLevel(2))).toBe(2);
    expect(getLevelFromXp(xpRequiredForLevel(2) - 1)).toBe(1);
    expect(getXpProgressForLevel(xpRequiredForLevel(2))).toMatchObject({
      level: 2,
      totalXp: xpRequiredForLevel(2),
      xpIntoLevel: xpRequiredForLevel(2) - xpRequiredForLevel(1),
      xpRemaining: xpRequiredForLevel(3) - xpRequiredForLevel(2),
    });
  });
});

describe('attributes & rebirth helpers', () => {
  it('applies diminishing returns as recent count increases', () => {
    const base = 10;
    const a = applyDiminishingReturns(base, 0);
    const b = applyDiminishingReturns(base, 5);
    expect(a).toBeGreaterThanOrEqual(b);
    expect(b).toBeGreaterThanOrEqual(1);
  });

  it('computes momentum correctly', () => {
    expect(computeMomentum(0, true)).toBe(1);
    expect(computeMomentum(5, true)).toBe(6);
    expect(computeMomentum(10, false)).toBe(0);
  });

  it('fair enemy xp scales with difficulty', () => {
    expect(fairEnemyXp(10, 2)).toBeGreaterThanOrEqual(20);
  });

  it('rebirth multiplier grows slowly', () => {
    expect(computeRebirthMultiplier(0)).toBeGreaterThanOrEqual(1);
    expect(computeRebirthMultiplier(10)).toBeGreaterThanOrEqual(1);
  });
});
