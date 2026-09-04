export const DIFFICULTY_CONFIG: Record<string, number> = {
  TRIVIAL: 5,
  EASY: 10,
  NORMAL: 25,
  HARD: 50,
  EPIC: 100,
  BOSS: 250,
};

export type QuestType =
  | 'DAILY'
  | 'WEEKLY'
  | 'SIDE'
  | 'MAIN'
  | 'BOSS'
  | 'MAINTENANCE'
  | 'RECOVERY'
  | 'EXPLORATION';

export type QuestStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type Difficulty = 'TRIVIAL' | 'EASY' | 'NORMAL' | 'HARD' | 'EPIC' | 'BOSS';
export type LevelUpState = { character: boolean; arena: boolean };

export function xpRequiredForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  let xpThreshold = xpRequiredForLevel(level);
  while (totalXp >= xpThreshold) {
    level += 1;
    xpThreshold = xpRequiredForLevel(level);
  }
  return Math.max(1, level - 1);
}

export function getXpProgressForLevel(totalXp: number) {
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

export function getXpRequiredForNextLevel(totalXp: number) {
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

export function calculateLevelProgress(totalXp: number) {
  const current = getXpProgressForLevel(totalXp);
  return {
    level: current.level,
    totalXp,
    xpIntoLevel: current.xpIntoLevel,
    xpRemaining: current.xpRemaining,
    progressPercent: Number(current.progressPercent.toFixed(2)),
  };
}

// --- Attributes & Rebirth helpers ---
export const CORE_ATTRIBUTES = [
  'DISCIPLINE',
  'STRENGTH',
  'HEALTH',
  'FOCUS',
  'ORDER',
  'CRAFT',
  'WEALTH',
  'CAREER',
  'CREATION',
  'COURAGE',
  'RELATIONSHIPS',
  'SPIRIT',
] as const;

export type AttributeName = typeof CORE_ATTRIBUTES[number];

export type DailyDomainName =
  | 'SEXUAL_DISCIPLINE'
  | 'SLEEP'
  | 'QUALITY_FOOD'
  | 'HYGIENE'
  | 'STRENGTH_MOVEMENT'
  | 'MONEY_DISCIPLINE'
  | 'CAREER_GROWTH'
  | 'FREELANCE_BUSINESS'
  | 'FORGE_BUILDING'
  | 'ORDER_ENVIRONMENT'
  | 'CREATIVE_OUTPUT'
  | 'SOCIAL_RELATIONSHIPS'
  | 'REFLECTION_SILENCE';

export const DAILY_DOMAINS: DailyDomainName[] = [
  'SEXUAL_DISCIPLINE',
  'SLEEP',
  'QUALITY_FOOD',
  'HYGIENE',
  'STRENGTH_MOVEMENT',
  'MONEY_DISCIPLINE',
  'CAREER_GROWTH',
  'FREELANCE_BUSINESS',
  'FORGE_BUILDING',
  'ORDER_ENVIRONMENT',
  'CREATIVE_OUTPUT',
  'SOCIAL_RELATIONSHIPS',
  'REFLECTION_SILENCE',
];

export type DailyState = 'DONE' | 'PARTIAL' | 'MISSED' | 'REST' | 'NOT_APPLICABLE';

// Centralized mapping from Daily Domain -> Attributes
export const DOMAIN_TO_ATTRIBUTES: Record<DailyDomainName, AttributeName[]> = {
  SEXUAL_DISCIPLINE: ['DISCIPLINE','FOCUS'],
  SLEEP: ['HEALTH','FOCUS'],
  QUALITY_FOOD: ['HEALTH','STRENGTH'],
  HYGIENE: ['HEALTH','ORDER'],
  STRENGTH_MOVEMENT: ['STRENGTH','HEALTH'],
  MONEY_DISCIPLINE: ['WEALTH','DISCIPLINE'],
  CAREER_GROWTH: ['CAREER','CRAFT'],
  FREELANCE_BUSINESS: ['WEALTH','CAREER'],
  FORGE_BUILDING: ['CRAFT','CREATION'],
  ORDER_ENVIRONMENT: ['ORDER','DISCIPLINE'],
  CREATIVE_OUTPUT: ['CREATION','CRAFT'],
  SOCIAL_RELATIONSHIPS: ['COURAGE','RELATIONSHIPS'],
  REFLECTION_SILENCE: ['SPIRIT','FOCUS'],
};

// Simple diminishing-returns: reduce awarded XP based on recent awards for same attribute
export function applyDiminishingReturns(baseAmount: number, recentAwardCount: number) {
  if (recentAwardCount <= 0) return baseAmount;
  const factor = 1 / Math.sqrt(1 + recentAwardCount * 0.2);
  return Math.max(1, Math.floor(baseAmount * factor));
}

// Legacy momentum helper kept for compatibility.
export function computeMomentum(prevMomentum: number, consecutiveSuccess: boolean) {
  if (!consecutiveSuccess) return 0;
  return Math.min(100, prevMomentum + 1);
}

// New momentum calculation based on today's domain states.
export function computeMomentumFromDay(prevMomentum: number, states: Record<string, DailyState>): number {
  // Count domain effects: DONE +1, PARTIAL 0, MISSED -1, REST/NOT_APPLICABLE 0
  let effect = 0;
  Object.values(states).forEach((s) => {
    if (s === 'DONE') effect += 1;
    else if (s === 'MISSED') effect -= 1;
  });

  let momentum = prevMomentum;
  if (effect > 0) momentum = Math.min(10, prevMomentum + 1);
  else if (effect < 0) momentum = Math.max(-5, prevMomentum - 1);

  return momentum;
}

// Fair Enemy: scale XP reward for a meaningful challenge (not trivial farming)
export function fairEnemyXp(baseXp: number, difficultyFactor = 1) {
  return Math.max(1, Math.floor(baseXp * difficultyFactor));
}

// Rebirth placeholder: compute rebirth effect (e.g., bonus XP multiplier)
export function computeRebirthMultiplier(rebirthCount: number) {
  return 1 + Math.min(1, rebirthCount * 0.05);
}
