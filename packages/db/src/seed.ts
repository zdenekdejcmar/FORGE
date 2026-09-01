import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { arenas, characters, journalEntries, questCompletions, quests, users, xpTransactions, attributes, rebirths } from './schema.js';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://forge:forge@localhost:5432/forge' });
const db = drizzle(pool);

async function seed() {
  const passwordHash = await bcrypt.hash('ForgeDev123!', 12);

  const existing = await db.select().from(users).where(eq(users.email, 'dev@forge.local')).limit(1);
  let userId = existing[0]?.id;

  if (!userId) {
    const inserted = await db.insert(users).values({
      email: 'dev@forge.local',
      passwordHash,
    } as any).returning({ id: users.id });
    userId = inserted[0].id;
  } else {
    // ensure reproducible dev password for local development
    await db.update(users).set({ passwordHash } as any).where(eq(users.id, userId));
  }

  const existingCharacter = await db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
  let characterId = existingCharacter[0]?.id;
  if (!characterId) {
    const insertedCharacter = await db.insert(characters).values({
      userId,
      name: 'ASIRU',
      title: 'The Builder',
      archetype: 'Creator',
      lore: 'A relentless maker who turns effort into structure.',
    }).returning({ id: characters.id });
    characterId = insertedCharacter[0].id;
  }

  const existingArenas = await db.select().from(arenas).where(eq(arenas.userId, userId));
  const arenaNames = ['Developer', 'Strength', 'Creation'];
  const arenaMap = new Map<string, string>();

  for (const name of arenaNames) {
    const record = existingArenas.find((arena) => arena.name === name);
    if (record) {
      arenaMap.set(name, record.id);
      continue;
    }

    const inserted = await db.insert(arenas).values({
      userId,
      name,
      description: `${name} arena`,
      slug: name.toLowerCase(),
    }).returning({ id: arenas.id });
    arenaMap.set(name, inserted[0].id);
  }

  const exampleQuests = [
    { title: 'Build authentication endpoint', arena: 'Developer', type: 'MAIN', difficulty: 'HARD', xpReward: 50 },
    { title: 'Create PostgreSQL migration', arena: 'Developer', type: 'MAIN', difficulty: 'NORMAL', xpReward: 25 },
    { title: '30-minute strength training', arena: 'Strength', type: 'DAILY', difficulty: 'EASY', xpReward: 10 },
    { title: 'Finish first production UI', arena: 'Creation', type: 'SIDE', difficulty: 'EPIC', xpReward: 100 },
  ];

  for (const quest of exampleQuests) {
    const existingQuest = await db.select().from(quests).where(eq(quests.userId, userId)).limit(100);
    const match = existingQuest.find((item) => item.title === quest.title);
    if (match) continue;

    const insertedQuest = await db.insert(quests).values({
      userId,
      arenaId: arenaMap.get(quest.arena) ?? arenaMap.get('Developer')!,
      title: quest.title,
      type: quest.type as any,
      difficulty: quest.difficulty as any,
      xpReward: quest.xpReward,
      status: 'COMPLETED',
      completedAt: new Date(Date.now() - 86400000 * 3),
    }).returning({ id: quests.id, arenaId: quests.arenaId });

    if (!insertedQuest[0]) continue;

    const completionCheck = await db.select().from(questCompletions).where(eq(questCompletions.questId, insertedQuest[0].id));
    if (completionCheck.length === 0) {
      await db.insert(questCompletions).values({
        questId: insertedQuest[0].id,
        userId,
        completedAt: new Date(Date.now() - 86400000 * 3),
      });
    }

    const xpExists = await db.select().from(xpTransactions).where(eq(xpTransactions.questId, insertedQuest[0].id));
    if (xpExists.length === 0) {
      await db.insert(xpTransactions).values({
        userId,
        characterId,
        arenaId: insertedQuest[0].arenaId,
        questId: insertedQuest[0].id,
        amount: quest.xpReward,
        sourceType: 'QUEST_COMPLETION',
        sourceId: insertedQuest[0].id,
      });
    }
  }

  const entry = await db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).limit(1);
  if (entry.length === 0) {
    await db.insert(journalEntries).values({
      userId,
      entryDate: new Date().toISOString().slice(0,10),
      built: 'Finished the core quest flow and validated the progression ledger.',
      burned: 'Context switching and environment setup overhead.',
      protect: 'Keep the XP loop atomic and well-documented.',
    });
  }
  // VIRGO rebirth and core attributes
  const virgoStart = new Date('2026-09-01T00:00:00Z');
  const virgoExists = await db.select().from(rebirths).where(eq(rebirths.rebirthType, 'VIRGO')).limit(1);
  if (virgoExists.length === 0) {
    await db.insert(rebirths).values({ userId, characterId, rebirthType: 'VIRGO', metadata: JSON.stringify({ name: 'Virgo', symbol: '♍', title: 'The Order', startsAt: virgoStart.toISOString(), theme: 'Build systems that continue working when motivation disappears.', primaryAttributes: ['ORDER','DISCIPLINE','CRAFT','HEALTH','FOCUS'] }) });
  }

  const coreAttributes = ['DISCIPLINE','STRENGTH','HEALTH','FOCUS','ORDER','CRAFT','WEALTH','CAREER','CREATION','COURAGE','RELATIONSHIPS','SPIRIT'];
  for (const a of coreAttributes) {
    const existingAttr = await db.select().from(attributes).where(eq(attributes.characterId, characterId)).limit(100);
    const match = existingAttr.find((item) => item.name === a);
    if (!match) {
      await db.insert(attributes).values({ characterId, name: a, value: 0 });
    }
  }

  console.log('Seed complete.');
  await pool.end();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
