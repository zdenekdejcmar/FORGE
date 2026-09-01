import { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { characters, users, questCompletions, xpTransactions, attributes } from '../../../../../packages/db/src/schema';
import { characterSchema } from '../../../../../packages/validation/src/index';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/http.js';

const characterRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const existing = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (existing.length > 0) {
      throw new ConflictError('CHARACTER_ALREADY_EXISTS', 'A character already exists for this user.');
    }

    const parsed = characterSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid character payload.');

    const created = await app.db.insert(characters).values({
      userId,
      name: parsed.data.name,
      title: parsed.data.title || null,
      archetype: parsed.data.archetype || null,
      lore: parsed.data.lore || null,
      avatarUrl: parsed.data.avatarUrl || null,
    }).returning();

    // create core attributes for the new character
    const coreAttributes = ['DISCIPLINE','STRENGTH','HEALTH','FOCUS','ORDER','CRAFT','WEALTH','CAREER','CREATION','COURAGE','RELATIONSHIPS','SPIRIT'];
    for (const a of coreAttributes) {
      await app.db.insert(attributes).values({ characterId: created[0].id, name: a, value: 0 });
    }

    reply.code(201).send(created[0]);
  });

  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const item = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (item.length === 0) {
      reply.send(null);
      return;
    }

    const totalXp = await app.db.select({ totalXp: sql<number>`COALESCE(SUM(amount), 0)::int` }).from(xpTransactions).where(eq(xpTransactions.userId, userId));
    reply.send({ ...item[0], totalXp: Number(totalXp[0]?.totalXp ?? 0) });
  });

  app.patch('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const existing = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
    if (existing.length === 0) {
      throw new NotFoundError('CHARACTER_NOT_FOUND', 'Character not found.');
    }

    const parsed = characterSchema.partial().safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid character update payload.');

    const updateData = {
      ...parsed.data,
      title: parsed.data.title ?? existing[0].title,
      archetype: parsed.data.archetype ?? existing[0].archetype,
      lore: parsed.data.lore ?? existing[0].lore,
      avatarUrl: parsed.data.avatarUrl ?? existing[0].avatarUrl,
      updatedAt: new Date(),
    };

    const updated = await app.db.update(characters).set(updateData).where(eq(characters.userId, userId)).returning();
    reply.send(updated[0]);
  });
};

export default characterRoutes;
