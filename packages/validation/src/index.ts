import { z } from 'zod';

export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8).max(128);
export const uuidSchema = z.string().uuid();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const characterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().max(120).optional().or(z.literal('')),
  archetype: z.string().trim().max(120).optional().or(z.literal('')),
  lore: z.string().trim().max(500).optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export const arenaSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  slug: z.string().trim().min(2).max(100),
});

export const questSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  arenaId: uuidSchema,
  type: z.enum(['DAILY','WEEKLY','SIDE','MAIN','BOSS','MAINTENANCE','RECOVERY','EXPLORATION']),
  difficulty: z.enum(['TRIVIAL','EASY','NORMAL','HARD','EPIC','BOSS']),
  xpReward: z.number().int().nonnegative().max(10000),
  status: z.enum(['DRAFT','ACTIVE','COMPLETED','ABANDONED']).optional(),
  dueAt: z.string().datetime({ offset: true }).optional().or(z.literal('')),
});

export const journalSchema = z.object({
  built: z.string().trim().max(500).optional().or(z.literal('')),
  burned: z.string().trim().max(500).optional().or(z.literal('')),
  protect: z.string().trim().max(500).optional().or(z.literal('')),
});

export const journalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const questCompletionRequestSchema = z.object({
  questId: uuidSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CharacterInput = z.infer<typeof characterSchema>;
export type ArenaInput = z.infer<typeof arenaSchema>;
export type QuestInput = z.infer<typeof questSchema>;
export type JournalInput = z.infer<typeof journalSchema>;
