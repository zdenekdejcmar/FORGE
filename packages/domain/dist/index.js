export const DIFFICULTY_CONFIG = {
    TRIVIAL: 5,
    EASY: 10,
    NORMAL: 25,
    HARD: 50,
    EPIC: 100,
    BOSS: 250,
};
export function xpRequiredForLevel(level) {
    if (level <= 0)
        return 0;
    return Math.floor(100 * Math.pow(level, 1.5));
}
export function getLevelFromXp(totalXp) {
    let level = 1;
    let xpThreshold = xpRequiredForLevel(level);
    while (totalXp >= xpThreshold) {
        level += 1;
        xpThreshold = xpRequiredForLevel(level);
    }
    return Math.max(1, level - 1);
}
export function getXpProgressForLevel(totalXp) {
    const level = getLevelFromXp(totalXp);
    const currentLevelStartXp = level <= 1 ? 0 : xpRequiredForLevel(level - 1);
    const currentLevelXp = xpRequiredForLevel(level);
    const nextLevelXp = xpRequiredForLevel(level + 1);
    const xpIntoLevel = Math.max(0, totalXp - currentLevelStartXp);
    const xpRequired = Math.max(1, nextLevelXp - currentLevelStartXp);
    const xpRemaining = Math.max(0, nextLevelXp - totalXp);
    const progressPercent = totalXp >= nextLevelXp ? 100 : (xpIntoLevel / xpRequired) * 100;
    return {
        level,
        totalXp,
        currentLevelXp,
        nextLevelXp,
        xpIntoLevel,
        xpRemaining,
        progressPercent,
    };
}
export function getXpRequiredForNextLevel(totalXp) {
    const currentLevel = getLevelFromXp(totalXp);
    const currentLevelXp = xpRequiredForLevel(currentLevel);
    const nextLevelXp = xpRequiredForLevel(currentLevel + 1);
    return {
        level: currentLevel,
        currentLevelXp,
        nextLevelXp,
        xpIntoLevel: totalXp - currentLevelXp,
        xpRemaining: Math.max(0, nextLevelXp - totalXp),
    };
}
export function calculateLevelProgress(totalXp) {
    const current = getXpProgressForLevel(totalXp);
    return {
        level: current.level,
        totalXp,
        xpIntoLevel: current.xpIntoLevel,
        xpRemaining: current.xpRemaining,
        progressPercent: Number(current.progressPercent.toFixed(2)),
    };
}
