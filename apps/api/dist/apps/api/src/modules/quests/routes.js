import { and, eq, sql } from 'drizzle-orm';
import { arenas, characters, questCompletions, quests, xpTransactions } from '../../../../../packages/db/src/schema';
import { questSchema } from '../../../../../packages/validation/src/index';
import { getXpProgressForLevel } from '../../../../../packages/domain/src/index';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/http.js';
const questRoutes = async (app) => {
    app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
        const parsed = questSchema.safeParse(request.body);
        if (!parsed.success)
            throw new ValidationError('Invalid quest payload.');
        const arena = await app.db.select().from(arenas).where(eq(arenas.id, parsed.data.arenaId)).limit(1);
        if (arena.length === 0)
            throw new NotFoundError('ARENA_NOT_FOUND', 'Arena not found.');
        const created = await app.db.insert(quests).values({
            userId: request.user.id,
            arenaId: parsed.data.arenaId,
            title: parsed.data.title,
            description: parsed.data.description || null,
            type: parsed.data.type,
            difficulty: parsed.data.difficulty,
            xpReward: parsed.data.xpReward,
            status: parsed.data.status ?? 'ACTIVE',
            dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        }).returning();
        reply.code(201).send(created[0]);
    });
    app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
        const filters = { userId: request.user.id };
        const query = app.db.select().from(quests).where(eq(quests.userId, request.user.id));
        const rows = await query;
        reply.send(rows);
    });
    app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const params = request.params;
        const row = await app.db.select().from(quests).where(and(eq(quests.id, params.id), eq(quests.userId, request.user.id))).limit(1);
        if (row.length === 0)
            throw new NotFoundError('QUEST_NOT_FOUND', 'Quest not found.');
        reply.send(row[0]);
    });
    app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const params = request.params;
        const existing = await app.db.select().from(quests).where(and(eq(quests.id, params.id), eq(quests.userId, request.user.id))).limit(1);
        if (existing.length === 0)
            throw new NotFoundError('QUEST_NOT_FOUND', 'Quest not found.');
        const parsed = questSchema.partial().safeParse(request.body);
        if (!parsed.success)
            throw new ValidationError('Invalid quest update payload.');
        const updateValues = { ...parsed.data, updatedAt: new Date() };
        if (parsed.data.dueAt !== undefined)
            updateValues.dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;
        if (parsed.data.status !== undefined)
            updateValues.status = parsed.data.status;
        const updated = await app.db.update(quests).set(updateValues).where(eq(quests.id, params.id)).returning();
        reply.send(updated[0]);
    });
    app.post('/:id/complete', { preHandler: [app.authenticate] }, async (request, reply) => {
        const params = request.params;
        const questId = params.id;
        const userId = request.user.id;
        const questRow = await app.db.select().from(quests).where(and(eq(quests.id, questId), eq(quests.userId, userId))).limit(1);
        if (questRow.length === 0)
            throw new NotFoundError('QUEST_NOT_FOUND', 'Quest not found.');
        const quest = questRow[0];
        if (quest.status === 'COMPLETED' || quest.status === 'ABANDONED') {
            throw new ConflictError('QUEST_ALREADY_COMPLETED', 'This quest has already been completed.');
        }
        const completionExists = await app.db.select().from(questCompletions).where(eq(questCompletions.questId, questId)).limit(1);
        if (completionExists.length > 0) {
            throw new ConflictError('QUEST_ALREADY_COMPLETED', 'This quest has already been completed.');
        }
        const character = await app.db.select().from(characters).where(eq(characters.userId, userId)).limit(1);
        if (character.length === 0)
            throw new NotFoundError('CHARACTER_NOT_FOUND', 'Character not found.');
        const reward = quest.xpReward;
        const completedAt = new Date();
        const completion = await app.db.transaction(async (tx) => {
            const insertedCompletion = await tx.insert(questCompletions).values({
                questId,
                userId,
                completedAt,
            }).returning();
            await tx.update(quests).set({
                status: 'COMPLETED',
                completedAt,
                updatedAt: completedAt,
            }).where(eq(quests.id, questId));
            const existingTransaction = await tx.select().from(xpTransactions).where(eq(xpTransactions.sourceId, insertedCompletion[0].id)).limit(1);
            if (existingTransaction.length > 0) {
                throw new ConflictError('XP_TRANSACTION_ALREADY_EXISTS', 'XP transaction already exists for this completion.');
            }
            const insertedXp = await tx.insert(xpTransactions).values({
                userId,
                characterId: character[0].id,
                arenaId: quest.arenaId,
                questId,
                amount: reward,
                sourceType: 'QUEST_COMPLETION',
                sourceId: insertedCompletion[0].id,
            }).returning();
            return { completion: insertedCompletion[0], xpTransaction: insertedXp[0], reward };
        });
        const totalXp = await app.db.select({ totalXp: sql `COALESCE(SUM(amount), 0)::int` }).from(xpTransactions).where(eq(xpTransactions.userId, userId));
        const arenaTotal = await app.db.select({ totalXp: sql `COALESCE(SUM(amount), 0)::int` }).from(xpTransactions).where(eq(xpTransactions.arenaId, quest.arenaId));
        const characterProgress = getXpProgressForLevel(Number(totalXp[0]?.totalXp ?? 0));
        const arenaProgress = getXpProgressForLevel(Number(arenaTotal[0]?.totalXp ?? 0));
        reply.send({
            quest: { id: quest.id, status: 'COMPLETED', completedAt },
            reward: { xp: reward, arenaId: quest.arenaId },
            characterProgress: {
                level: characterProgress.level,
                totalXp: characterProgress.totalXp,
                xpIntoLevel: characterProgress.xpIntoLevel,
                xpRemaining: characterProgress.xpRemaining,
                progressPercent: Number(characterProgress.progressPercent.toFixed(2)),
            },
            arenaProgress: {
                level: arenaProgress.level,
                totalXp: arenaProgress.totalXp,
                xpIntoLevel: arenaProgress.xpIntoLevel,
                xpRemaining: arenaProgress.xpRemaining,
                progressPercent: Number(arenaProgress.progressPercent.toFixed(2)),
            },
            levelUp: { character: false, arena: false },
            completionId: completion.completion.id,
        });
    });
    app.post('/:id/abandon', { preHandler: [app.authenticate] }, async (request, reply) => {
        const params = request.params;
        const existing = await app.db.select().from(quests).where(and(eq(quests.id, params.id), eq(quests.userId, request.user.id))).limit(1);
        if (existing.length === 0)
            throw new NotFoundError('QUEST_NOT_FOUND', 'Quest not found.');
        if (existing[0].status === 'COMPLETED')
            throw new ConflictError('QUEST_ALREADY_COMPLETED', 'Completed quests cannot be abandoned.');
        const updated = await app.db.update(quests).set({ status: 'ABANDONED', updatedAt: new Date() }).where(eq(quests.id, params.id)).returning();
        reply.send(updated[0]);
    });
};
export default questRoutes;
