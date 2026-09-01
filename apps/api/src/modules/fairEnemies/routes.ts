import { FastifyPluginAsync } from 'fastify';
import { and, eq } from 'drizzle-orm';
import {
  fairEnemies,
  characters,
  xpTransactions,
} from '../../../../../packages/db/src/schema';

const fairRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/today',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;

      const character = await app.db
        .select()
        .from(characters)
        .where(eq(characters.userId, userId))
        .limit(1);

      if (character.length === 0) {
        return reply.send(null);
      }

      const today = new Date().toISOString().slice(0, 10);

      const row = await app.db
        .select()
        .from(fairEnemies)
        .where(
          and(
            eq(fairEnemies.characterId, character[0].id),
            eq(fairEnemies.entryDate, today),
          ),
        )
        .limit(1);

      return reply.send(row[0] ?? null);
    },
  );

  app.post(
    '/today',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        difficulty?: 'NORMAL' | 'HARD' | 'EPIC';
        primaryAttribute?: string;
        xpReward?: number;
      };

      const userId = request.user!.id;

      const character = await app.db
        .select()
        .from(characters)
        .where(eq(characters.userId, userId))
        .limit(1);

      if (character.length === 0) {
        return reply.code(400).send({
          error: {
            code: 'NO_CHARACTER',
          },
        });
      }

      const today = new Date().toISOString().slice(0, 10);

      const existing = await app.db
        .select()
        .from(fairEnemies)
        .where(
          and(
            eq(fairEnemies.characterId, character[0].id),
            eq(fairEnemies.entryDate, today),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return reply.code(200).send(existing[0]);
      }

      const inserted = await app.db
        .insert(fairEnemies)
        .values({
          userId,
          characterId: character[0].id,
          entryDate: today,
          name: body.name,
          difficulty: body.difficulty ?? 'NORMAL',
          primaryAttribute: body.primaryAttribute,
          xpReward: body.xpReward ?? 0,
        })
        .returning();

      return reply.code(201).send(inserted[0]);
    },
  );

  app.post(
    '/:id/defeat',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = request.params as { id: string };
      const userId = request.user!.id;

      const result = await app.db.transaction(async (tx) => {
        const row = await tx
          .select()
          .from(fairEnemies)
          .where(
            and(
              eq(fairEnemies.id, params.id),
              eq(fairEnemies.userId, userId),
            ),
          )
          .limit(1);

        if (row.length === 0) {
          return {
            kind: 'NOT_FOUND' as const,
          };
        }

        const enemy = row[0];

        if (enemy.status === 'DEFEATED') {
          return {
            kind: 'DEFEATED' as const,
            enemy,
          };
        }

        if (enemy.status === 'ABANDONED') {
          return {
            kind: 'ABANDONED' as const,
          };
        }

        await tx
          .update(fairEnemies)
          .set({
            status: 'DEFEATED',
            completedAt: new Date(),
          })
          .where(
            and(
              eq(fairEnemies.id, params.id),
              eq(fairEnemies.userId, userId),
            ),
          );

        const existingXp = await tx
          .select()
          .from(xpTransactions)
          .where(
            and(
              eq(xpTransactions.sourceType, 'FAIR_ENEMY'),
              eq(xpTransactions.sourceId, params.id),
            ),
          )
          .limit(1);

        if (existingXp.length === 0 && enemy.xpReward > 0) {
          await tx.insert(xpTransactions).values({
            userId,
            characterId: enemy.characterId,
            amount: enemy.xpReward,
            sourceType: 'FAIR_ENEMY',
            sourceId: params.id,
          });
        }

        const updated = await tx
          .select()
          .from(fairEnemies)
          .where(
            and(
              eq(fairEnemies.id, params.id),
              eq(fairEnemies.userId, userId),
            ),
          )
          .limit(1);

        return {
          kind: 'DEFEATED' as const,
          enemy: updated[0],
        };
      });

      if (result.kind === 'NOT_FOUND') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
          },
        });
      }

      if (result.kind === 'ABANDONED') {
        return reply.code(400).send({
          error: {
            code: 'ALREADY_ABANDONED',
          },
        });
      }

      return reply.code(200).send(result.enemy);
    },
  );

  app.post(
    '/:id/abandon',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = request.params as { id: string };
      const userId = request.user!.id;

      const row = await app.db
        .select()
        .from(fairEnemies)
        .where(
          and(
            eq(fairEnemies.id, params.id),
            eq(fairEnemies.userId, userId),
          ),
        )
        .limit(1);

      if (row.length === 0) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
          },
        });
      }

      if (row[0].status !== 'ACTIVE') {
        return reply.code(400).send({
          error: {
            code: 'CANNOT_ABANDON',
          },
        });
      }

      const updated = await app.db
        .update(fairEnemies)
        .set({
          status: 'ABANDONED',
          completedAt: new Date(),
        })
        .where(
          and(
            eq(fairEnemies.id, params.id),
            eq(fairEnemies.userId, userId),
          ),
        )
        .returning();

      return reply.send(updated[0]);
    },
  );
};

export default fairRoutes;
