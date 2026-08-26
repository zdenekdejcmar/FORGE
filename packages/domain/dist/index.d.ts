export declare const DIFFICULTY_CONFIG: Record<string, number>;
export type QuestType = 'DAILY' | 'WEEKLY' | 'SIDE' | 'MAIN' | 'BOSS' | 'MAINTENANCE' | 'RECOVERY' | 'EXPLORATION';
export type QuestStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type Difficulty = 'TRIVIAL' | 'EASY' | 'NORMAL' | 'HARD' | 'EPIC' | 'BOSS';
export type LevelUpState = {
    character: boolean;
    arena: boolean;
};
export declare function xpRequiredForLevel(level: number): number;
export declare function getLevelFromXp(totalXp: number): number;
export declare function getXpProgressForLevel(totalXp: number): {
    level: number;
    totalXp: number;
    currentLevelXp: number;
    nextLevelXp: number;
    xpIntoLevel: number;
    xpRemaining: number;
    progressPercent: number;
};
export declare function getXpRequiredForNextLevel(totalXp: number): {
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
    xpIntoLevel: number;
    xpRemaining: number;
};
export declare function calculateLevelProgress(totalXp: number): {
    level: number;
    totalXp: number;
    xpIntoLevel: number;
    xpRemaining: number;
    progressPercent: number;
};
