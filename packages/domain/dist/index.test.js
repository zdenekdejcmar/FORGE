import { describe, expect, it } from 'vitest';
import { calculateLevelProgress, getLevelFromXp, getXpProgressForLevel, xpRequiredForLevel, } from './index';
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
