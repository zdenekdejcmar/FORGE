import { pgTable, uuid, text, timestamp, integer, boolean, primaryKey, uniqueIndex, foreignKey, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  title: text('title'),
  archetype: text('archetype'),
  avatarUrl: text('avatar_url'),
  lore: text('lore'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const arenas = pgTable('arenas', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const quests = pgTable('quests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  arenaId: uuid('arena_id').notNull().references(() => arenas.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type', { enum: ['DAILY','WEEKLY','SIDE','MAIN','BOSS','MAINTENANCE','RECOVERY','EXPLORATION'] }).notNull(),
  difficulty: text('difficulty', { enum: ['TRIVIAL','EASY','NORMAL','HARD','EPIC','BOSS'] }).notNull(),
  xpReward: integer('xp_reward').notNull(),
  status: text('status', { enum: ['DRAFT','ACTIVE','COMPLETED','ABANDONED'] }).notNull().default('ACTIVE'),
  dueAt: timestamp('due_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const questCompletions = pgTable('quest_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  questId: uuid('quest_id').notNull().references(() => quests.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userQuestUnique: unique('quest_completion_unique').on(table.questId),
}));

export const xpTransactions = pgTable('xp_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  arenaId: uuid('arena_id').references(() => arenas.id),
  questId: uuid('quest_id').references(() => quests.id),
  amount: integer('amount').notNull(),
  sourceType: text('source_type', { enum: ['QUEST_COMPLETION','ATTRIBUTE','DAILY_CHECKIN','REBIRTH','MOMENTUM','FAIR_ENEMY','RECOVERY'] }).notNull(),
  sourceId: uuid('source_id').notNull(),
  dailyCheckinId: uuid('daily_checkin_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attributes = pgTable('attributes', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  name: text('name').notNull(),
  value: integer('value').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dailyCheckins = pgTable('daily_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  entryDate: text('entry_date').notNull(),
  states: text('states'),
  momentum: integer('momentum').notNull().default(0),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userDateUnique: unique('daily_checkin_user_date_unique').on(table.userId, table.entryDate),
}));

export const rebirths = pgTable('rebirths', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  rebirthType: text('rebirth_type'),
  metadata: text('metadata'),
  rebirthAt: timestamp('rebirth_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const fairEnemies = pgTable('fair_enemies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  entryDate: text('entry_date').notNull(),
  name: text('name').notNull(),
  difficulty: text('difficulty', { enum: ['NORMAL','HARD','EPIC'] }).notNull().default('NORMAL'),
  primaryAttribute: text('primary_attribute'),
  xpReward: integer('xp_reward').notNull().default(0),
  status: text('status', { enum: ['ACTIVE','DEFEATED','ABANDONED'] }).notNull().default('ACTIVE'),
  reflection: text('reflection'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  uniquePerDay: unique('fair_enemy_unique_per_day').on(table.characterId, table.entryDate),
}));

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  entryDate: text('entry_date').notNull(),
  built: text('built'),
  burned: text('burned'),
  protect: text('protect'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  journalUserDateUnique: unique('journal_user_date_unique').on(table.userId, table.entryDate),
}));
