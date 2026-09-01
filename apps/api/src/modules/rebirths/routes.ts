import { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { rebirths, characters, xpTransactions } from '../../../../../packages/db/src/schema';
import { computeRebirthMultiplier } from '../../../../../packages/domain/src/index';

const rebirthRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (character.length === 0) return reply.code(400).send({ error: { code: 'NO_CHARACTER' } });

    const prevCount = await app.db.select().from(rebirths).where(eq(rebirths.characterId, character[0].id));
    const multiplier = computeRebirthMultiplier(prevCount.length ?? 0);

    const inserted = await app.db.insert(rebirths).values({ userId, characterId: character[0].id, rebirthType: 'GENERIC' }).returning();

    // award rebirth XP as a function of totalxp * multiplier (small bonus)
    const bonus = Math.max(1, Math.floor(10 * multiplier));
    await app.db.insert(xpTransactions).values({ userId, characterId: character[0].id, amount: bonus, sourceType: 'REBIRTH', sourceId: inserted[0].id });

    reply.code(201).send(inserted[0]);
  });

  app.get('/current', { preHandler: [app.authenticate] }, async (request, reply) => {
    const rows = await app.db.select().from(rebirths).orderBy(sql`rebirth_at DESC`);
    const now = new Date();
    const current = rows.find((r) => {
      try {
        const meta = JSON.parse(r.metadata ?? '{}');
        return meta?.startsAt ? new Date(meta.startsAt) <= now : true;
      } catch {
        return false;
      }
    });
    reply.send(current ?? null);
  });
};

export default rebirthRoutes;
