import { and, eq, isNull, sql } from 'drizzle-orm';
import { arenas, quests, xpTransactions } from '../../../../../packages/db/src/schema';
import { arenaSchema } from '../../../../../packages/validation/src/index';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/http.js';
const arenaRoutes = async (app) => {
    app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
        const parsed = arenaSchema.safeParse(request.body);
        if (!parsed.success)
            throw new ValidationError('Invalid arena payload.');
        const slug = parsed.data.slug || parsed.data.name.toLowerCase().replace(/\s+/g, '-');
        const existing = await app.db.select().from(arenas).where(and(eq(arenas.userId, request.user.id), eq(arenas.slug, slug), isNull(arenas.deletedAt))).limit(1);
        if (existing.length > 0) {
            throw new ConflictError('ARENA_ALREADY_EXISTS', 'An arena with that slug already exists.');
        }
        const created = await app.db.insert(arenas).values({
            userId: request.user.id,
            name: parsed.data.name,
            description: parsed.data.description || null,
            slug,
        }).returning();
        reply.code(201).send(created[0]);
    });
    app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
        const rows = await app.db.select().from(arenas).where(and(eq(arenas.userId, request.user.id), isNull(arenas.deletedAt)));
        const result = await Promise.all(rows.map(async (arena) => {
            const totalXpRow = await app.db.select({ totalXp: sql `COALESCE(SUM(amount), 0)::int` }).from(xpTransactions).where(eq(xpTransactions.arenaId, arena.id));
            const activeQuestCount = await app.db.select({ count: sql `COUNT(*)::int` }).from(quests).where(and(eq(quests.arenaId, arena.id), eq(quests.status, 'ACTIVE')));
            const completedQuestCount = await app.db.select({ count: sql `COUNT(*)::int` }).from(quests).where(and(eq(quests.arenaId, arena.id), eq(quests.status, 'COMPLETED')));
            return {
                ...arena,
                totalXp: Number(totalXpRow[0]?.totalXp ?? 0),
                activeQuestCount: Number(activeQuestCount[0]?.count ?? 0),
                completedQuestCount: Number(completedQuestCount[0]?.count ?? 0),
            };
        }));
        reply.send(result);
    });
    app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const params = request.params;
        const item = await app.db.select().from(arenas).where(and(eq(arenas.id, params.id), eq(arenas.userId, request.user.id), isNull(arenas.deletedAt))).limit(1);
        if (item.length === 0)
            throw new NotFoundError('ARENA_NOT_FOUND', 'Arena not found.');
        const totalXpRow = await app.db.select({ totalXp: sql `COALESCE(SUM(amount), 0)::int` }).from(xpTransactions).where(eq(xpTransactions.arenaId, item[0].id));
        reply.send({ ...item[0], totalXp: Number(totalXpRow[0]?.totalXp ?? 0) });
    });
    app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const params = request.params;
        const item = await app.db.select().from(arenas).where(and(eq(arenas.id, params.id), eq(arenas.userId, request.user.id), isNull(arenas.deletedAt))).limit(1);
        if (item.length === 0)
            throw new NotFoundError('ARENA_NOT_FOUND', 'Arena not found.');
        const parsed = arenaSchema.partial().safeParse(request.body);
        if (!parsed.success)
            throw new ValidationError('Invalid arena update payload.');
        const values = {
            ...parsed.data,
            description: parsed.data.description ?? item[0].description,
            updatedAt: new Date(),
        };
        const updated = await app.db.update(arenas).set(values).where(eq(arenas.id, params.id)).returning();
        reply.send(updated[0]);
    });
    app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const params = request.params;
        const item = await app.db.select().from(arenas).where(and(eq(arenas.id, params.id), eq(arenas.userId, request.user.id), isNull(arenas.deletedAt))).limit(1);
        if (item.length === 0)
            throw new NotFoundError('ARENA_NOT_FOUND', 'Arena not found.');
        const questCount = await app.db.select({ count: sql `COUNT(*)::int` }).from(quests).where(eq(quests.arenaId, item[0].id));
        const xpCount = await app.db.select({ count: sql `COUNT(*)::int` }).from(xpTransactions).where(eq(xpTransactions.arenaId, item[0].id));
        if (Number(questCount[0]?.count ?? 0) > 0 || Number(xpCount[0]?.count ?? 0) > 0) {
            await app.db.update(arenas).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(arenas.id, item[0].id));
            reply.send({ success: true, softDeleted: true });
            return;
        }
        await app.db.delete(arenas).where(eq(arenas.id, item[0].id));
        reply.send({ success: true, softDeleted: false });
    });
};
export default arenaRoutes;
