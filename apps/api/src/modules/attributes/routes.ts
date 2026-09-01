import { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { attributes, characters, xpTransactions } from '../../../../../packages/db/src/schema';
import { applyDiminishingReturns } from '../../../../../packages/domain/src/index';

const attributeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (character.length === 0) {
      reply.send([]);
      return;
    }
    const rows = await app.db.select().from(attributes).where(eq(attributes.characterId, character[0].id));
    reply.send(rows);
  });

  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as { name: string; value?: number };
    const userId = request.user!.id;
    const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (character.length === 0) return reply.code(400).send({ error: { code: 'NO_CHARACTER', message: 'No character found.' } });
    const result = await app.db.insert(attributes).values({ characterId: character[0].id, name: body.name, value: body.value ?? 0 }).returning();
    reply.code(201).send(result[0]);
  });

  app.post('/:id/award', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { amount: number } | undefined;
    const userId = request.user!.id;
    const attr = await app.db.select().from(attributes).where(eq(attributes.id, params.id)).limit(1);
    if (attr.length === 0) return reply.code(404).send({ error: { code: 'ATTRIBUTE_NOT_FOUND' } });

    // count recent awards for this attribute in the last 24 hours
    const countRow = await app.db.select({ c: sql<number>`COUNT(*)::int` }).from(xpTransactions).where(sql`source_type = 'ATTRIBUTE' AND source_id = ${params.id} AND created_at > now() - interval '24 hours'`);
    const recentCount = Number(countRow[0]?.c ?? 0);
    const baseAmount = body?.amount ?? 1;
    const adjusted = applyDiminishingReturns(baseAmount, recentCount);

    const inserted = await app.db.insert(xpTransactions).values({ userId, characterId: attr[0].characterId, amount: adjusted, sourceType: 'ATTRIBUTE', sourceId: attr[0].id }).returning();
    reply.send(inserted[0]);
  });
};

export default attributeRoutes;
