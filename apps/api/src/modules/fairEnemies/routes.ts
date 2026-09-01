import { FastifyPluginAsync } from 'fastify';
import { eq, sql, and } from 'drizzle-orm';
import { fairEnemies, characters, xpTransactions } from '../../../../../packages/db/src/schema';

const fairRoutes: FastifyPluginAsync = async (app) => {
  app.get('/today', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (character.length === 0) return reply.send(null);
    const today = new Date().toISOString().slice(0,10);
    const row = await app.db.select().from(fairEnemies).where(and(eq(fairEnemies.characterId, character[0].id), eq(fairEnemies.entryDate, today))).limit(1);
    reply.send(row[0] ?? null);
  });

  app.post('/today', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as { name: string; difficulty?: 'NORMAL'|'HARD'|'EPIC'; primaryAttribute?: string; xpReward?: number };
    const userId = request.user!.id;
    const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (character.length === 0) return reply.code(400).send({ error: { code: 'NO_CHARACTER' } });
    const today = new Date().toISOString().slice(0,10);
    const existing = await app.db.select().from(fairEnemies).where(and(eq(fairEnemies.characterId, character[0].id), eq(fairEnemies.entryDate, today))).limit(1);
    if (existing.length > 0) return reply.code(200).send(existing[0]);

    const inserted = await app.db.insert(fairEnemies).values({ userId, characterId: character[0].id, entryDate: today, name: body.name, difficulty: body.difficulty ?? 'NORMAL', primaryAttribute: body.primaryAttribute, xpReward: body.xpReward ?? 0 }).returning();
    reply.code(201).send(inserted[0]);
  });

  app.post('/:id/defeat', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = request.params as { id: string };
    const userId = request.user!.id;
    // Use transaction to mark defeated and award XP once
    await app.db.transaction(async (tx) => {
      const row = await tx.select().from(fairEnemies).where(eq(fairEnemies.id, params.id)).limit(1);
      if (row.length === 0) return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
      if (row[0].status === 'DEFEATED') return reply.code(200).send(row[0]);
      if (row[0].status === 'ABANDONED') return reply.code(400).send({ error: { code: 'ALREADY_ABANDONED' } });

      await tx.update(fairEnemies).set({ status: 'DEFEATED', completedAt: new Date() }).where(eq(fairEnemies.id, params.id));

      // award XP once using xp_transactions unique constraint (source_type, source_id)
      const exists = await tx.select().from(xpTransactions).where(and(eq(xpTransactions.sourceType, 'FAIR_ENEMY'), eq(xpTransactions.sourceId, params.id))).limit(1);
      if (exists.length === 0 && row[0].xpReward > 0) {
        await tx.insert(xpTransactions).values({ userId, characterId: row[0].characterId, amount: row[0].xpReward, sourceType: 'FAIR_ENEMY', sourceId: params.id });
      }
    });

    const updated = await app.db.select().from(fairEnemies).where(eq(fairEnemies.id, params.id)).limit(1);
    reply.send(updated[0]);
  });

  app.post('/:id/abandon', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = request.params as { id: string };
    const row = await app.db.select().from(fairEnemies).where(eq(fairEnemies.id, params.id)).limit(1);
    if (row.length === 0) return reply.code(404).send({ error: { code: 'NOT_FOUND' } });
    if (row[0].status !== 'ACTIVE') return reply.code(400).send({ error: { code: 'CANNOT_ABANDON' } });
    await app.db.update(fairEnemies).set({ status: 'ABANDONED', completedAt: new Date() }).where(eq(fairEnemies.id, params.id));
    const updated = await app.db.select().from(fairEnemies).where(eq(fairEnemies.id, params.id)).limit(1);
    reply.send(updated[0]);
  });
};

export default fairRoutes;
