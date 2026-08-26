import { eq, sql } from 'drizzle-orm';
import { arenas, characters, xpTransactions } from '../../../../../packages/db/src/schema';
import { getXpProgressForLevel } from '../../../../../packages/domain/src/index';
const progressionRoutes = async (app) => {
    app.get('/character', { preHandler: [app.authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
        if (character.length === 0) {
            reply.send({ level: 1, totalXp: 0, xpIntoLevel: 0, xpRemaining: 0, progressPercent: 0 });
            return;
        }
        const row = await app.db.select({ totalXp: sql `COALESCE(SUM(amount), 0)::int` }).from(xpTransactions).where(eq(xpTransactions.userId, userId));
        const result = getXpProgressForLevel(Number(row[0]?.totalXp ?? 0));
        reply.send({
            level: result.level,
            totalXp: result.totalXp,
            xpIntoLevel: result.xpIntoLevel,
            xpRemaining: result.xpRemaining,
            progressPercent: Number(result.progressPercent.toFixed(2)),
        });
    });
    app.get('/arenas', { preHandler: [app.authenticate] }, async (request, reply) => {
        const arenaRows = await app.db.select().from(arenas).where(eq(arenas.userId, request.user.id));
        const result = await Promise.all(arenaRows.map(async (arena) => {
            const row = await app.db.select({ totalXp: sql `COALESCE(SUM(amount), 0)::int` }).from(xpTransactions).where(eq(xpTransactions.arenaId, arena.id));
            const progress = getXpProgressForLevel(Number(row[0]?.totalXp ?? 0));
            return {
                ...arena,
                level: progress.level,
                totalXp: progress.totalXp,
                xpIntoLevel: progress.xpIntoLevel,
                xpRemaining: progress.xpRemaining,
                progressPercent: Number(progress.progressPercent.toFixed(2)),
            };
        }));
        reply.send(result);
    });
    app.get('/arenas/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const params = request.params;
        const arena = await app.db.select().from(arenas).where(eq(arenas.id, params.id)).limit(1);
        if (arena.length === 0) {
            reply.code(404).send({ error: { code: 'ARENA_NOT_FOUND', message: 'Arena not found.' } });
            return;
        }
        const row = await app.db.select({ totalXp: sql `COALESCE(SUM(amount), 0)::int` }).from(xpTransactions).where(eq(xpTransactions.arenaId, arena[0].id));
        const progress = getXpProgressForLevel(Number(row[0]?.totalXp ?? 0));
        reply.send({
            ...arena[0],
            level: progress.level,
            totalXp: progress.totalXp,
            xpIntoLevel: progress.xpIntoLevel,
            xpRemaining: progress.xpRemaining,
            progressPercent: Number(progress.progressPercent.toFixed(2)),
        });
    });
    app.get('/xp-transactions', { preHandler: [app.authenticate] }, async (request, reply) => {
        const rows = await app.db.select().from(xpTransactions).where(eq(xpTransactions.userId, request.user.id)).orderBy(sql `created_at DESC`);
        reply.send(rows);
    });
};
export default progressionRoutes;
