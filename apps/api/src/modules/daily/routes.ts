import { FastifyPluginAsync } from 'fastify';
import { eq, sql, and } from 'drizzle-orm';
import { dailyCheckins, characters, xpTransactions, attributes } from '../../../../../packages/db/src/schema';
import { computeMomentum } from '../../../../../packages/domain/src/index';

const dailyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/checkin', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as { states?: Record<string, 'DONE'|'PARTIAL'|'MISSED'|'REST'|'NOT_APPLICABLE'> };
    const userId = request.user!.id;
    const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (character.length === 0) return reply.code(400).send({ error: { code: 'NO_CHARACTER' } });

    const today = new Date().toISOString().slice(0, 10);
    const existing = await app.db.select().from(dailyCheckins).where(and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.entryDate, today))).limit(1);
    if (existing.length > 0) {
      // idempotent update: persist states but don't duplicate XP awards
      const updated = await app.db.update(dailyCheckins).set({ states: JSON.stringify(body.states ?? {}) } as any).where(eq(dailyCheckins.id, existing[0].id)).returning();
      return reply.code(200).send(updated[0]);
    }

    const lastRow = await app.db.select().from(dailyCheckins).where(eq(dailyCheckins.userId, userId)).orderBy(sql`created_at DESC`).limit(1);
    const prevMomentum = lastRow[0]?.momentum ?? 0;

    // Simple day effect: DONE +1, MISSED -1, others 0. Then normalize to a small per-day momentum change.
    const states = body.states ?? {};
    let dayEffect = 0;
    Object.values(states).forEach((s) => {
      if (s === 'DONE') dayEffect += 1;
      else if (s === 'MISSED') dayEffect -= 1;
    });

    let momentum = prevMomentum;
    if (dayEffect > 0) momentum = Math.min(10, prevMomentum + 1);
    else if (dayEffect < 0) momentum = Math.max(-5, prevMomentum - 1);

    // Recovery eligibility and award
    const prevHadMissed = lastRow.length > 0 && typeof lastRow[0].states === 'string' && lastRow[0].states.includes('MISSED');
    let recoveryAward = 0;
    if (prevHadMissed) {
      const recoveryDoneCount = Object.values(states).filter((s) => s === 'DONE').length;
      if (recoveryDoneCount >= 3) {
        momentum = Math.min(10, momentum + 1);
        recoveryAward = 5;
      }
    }

    const inserted = await app.db.insert(dailyCheckins).values({ userId, characterId: character[0].id, entryDate: today, momentum, states: JSON.stringify(states) }).returning();
    const insertedRow = inserted[0];

    // award base XP for check-in (auditable, idempotent because sourceId is the daily checkin id)
    const baseAmount = 5 + Math.max(0, momentum);
    await app.db.insert(xpTransactions).values({ userId, characterId: character[0].id, amount: baseAmount, sourceType: 'DAILY_CHECKIN', sourceId: insertedRow.id });

    // award attribute XP for DONE states (prevent duplicates today per attribute)
    for (const [attrName, state] of Object.entries(states)) {
      if (state !== 'DONE') continue;
      const attrRow = await app.db.select().from(attributes).where(and(eq(attributes.characterId, character[0].id), eq(attributes.name, attrName))).limit(1);
      if (attrRow.length === 0) continue;
      const attr = attrRow[0];

      const already = await app.db.select().from(xpTransactions).where(and(eq(xpTransactions.sourceType, 'ATTRIBUTE'), eq(xpTransactions.sourceId, attr.id), sql`created_at >= date_trunc('day', now())`)).limit(1);
      if (already.length > 0) continue;

      await app.db.insert(xpTransactions).values({ userId, characterId: character[0].id, amount: 5, sourceType: 'ATTRIBUTE', sourceId: attr.id });
    }

    if (recoveryAward > 0) {
      await app.db.insert(xpTransactions).values({ userId, characterId: character[0].id, amount: recoveryAward, sourceType: 'RECOVERY', sourceId: insertedRow.id });
    }

    reply.code(201).send(insertedRow);
  });

  app.get('/today', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (character.length === 0) return reply.send(null);
    const today = new Date().toISOString().slice(0,10);
    const row = await app.db.select().from(dailyCheckins).where(and(eq(dailyCheckins.characterId, character[0].id), eq(dailyCheckins.entryDate, today))).limit(1);
    reply.send(row[0] ?? null);
  });
};

export default dailyRoutes;
