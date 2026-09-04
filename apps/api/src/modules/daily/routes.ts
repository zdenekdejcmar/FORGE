import { FastifyPluginAsync } from 'fastify';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';

import {
  attributes,
  characters,
  dailyCheckins,
  xpTransactions,
} from '../../../../../packages/db/src/schema';

import {
  computeMomentumFromDay,
  DAILY_DOMAINS,
  DOMAIN_TO_ATTRIBUTES,
  type DailyDomainName,
  type DailyState,
} from '../../../../../packages/domain/src/index';

const VALID_DAILY_STATES: DailyState[] = [
  'DONE',
  'PARTIAL',
  'MISSED',
  'REST',
  'NOT_APPLICABLE',
];

const STATE_XP: Record<DailyState, number> = {
  DONE: 5,
  PARTIAL: 2,
  MISSED: 0,
  REST: 0,
  NOT_APPLICABLE: 0,
};

function parseStates(raw: unknown): Record<DailyDomainName, DailyState> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {} as Record<DailyDomainName, DailyState>;
  }

  return raw as Record<DailyDomainName, DailyState>;
}

function validateStates(states: Record<string, unknown>) {
  const invalidKeys = Object.keys(states).filter(
    (key) => !DAILY_DOMAINS.includes(key as DailyDomainName),
  );

  const invalidStates = Object.entries(states)
    .filter(
      ([, value]) =>
        typeof value !== 'string' ||
        !VALID_DAILY_STATES.includes(value as DailyState),
    )
    .map(([key]) => key);

  return {
    invalidKeys,
    invalidStates,
  };
}

function deserializeStates(
  value: unknown,
): Record<DailyDomainName, DailyState> {
  if (!value) {
    return {} as Record<DailyDomainName, DailyState>;
  }

  if (typeof value === 'string') {
    try {
      return parseStates(JSON.parse(value));
    } catch {
      return {} as Record<DailyDomainName, DailyState>;
    }
  }

  return parseStates(value);
}

const dailyRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/checkin',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;
      const body = request.body as {
        states?: Record<string, unknown>;
      };

      const states = body.states ?? {};
      const validation = validateStates(states);

      if (validation.invalidKeys.length > 0) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_DAILY_DOMAIN_KEYS',
            details: validation.invalidKeys,
          },
        });
      }

      if (validation.invalidStates.length > 0) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_DAILY_STATES',
            details: validation.invalidStates,
          },
        });
      }

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

      const characterId = character[0].id;
      const today = new Date().toISOString().slice(0, 10);

      const existing = await app.db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.userId, userId),
            eq(dailyCheckins.entryDate, today),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].resolvedAt) {
          return reply.code(409).send({
            error: {
              code: 'DAY_ALREADY_RESOLVED',
            },
          });
        }

        const updated = await app.db
          .update(dailyCheckins)
          .set({
            states: JSON.stringify(states),
          })
          .where(
            and(
              eq(dailyCheckins.id, existing[0].id),
              eq(dailyCheckins.userId, userId),
            ),
          )
          .returning();

        return reply.code(200).send(updated[0]);
      }

      const previous = await app.db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.userId, userId),
            lt(dailyCheckins.entryDate, today),
          ),
        )
        .orderBy(sql`${dailyCheckins.entryDate} DESC`)
        .limit(1);

      const previousMomentum = previous[0]?.momentum ?? 0;

      const inserted = await app.db
        .insert(dailyCheckins)
        .values({
          userId,
          characterId,
          entryDate: today,
          states: JSON.stringify(states),
          momentum: previousMomentum,
        })
        .returning();

      return reply.code(201).send(inserted[0]);
    },
  );

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
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.characterId, character[0].id),
            eq(dailyCheckins.userId, userId),
            eq(dailyCheckins.entryDate, today),
          ),
        )
        .limit(1);

      return reply.send(row[0] ?? null);
    },
  );

  app.post(
    '/complete',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
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

      const characterId = character[0].id;
      const today = new Date().toISOString().slice(0, 10);

      const result = await app.db.transaction(async (tx) => {
        const entryRows = await tx
          .select()
          .from(dailyCheckins)
          .where(
            and(
              eq(dailyCheckins.characterId, characterId),
              eq(dailyCheckins.userId, userId),
              eq(dailyCheckins.entryDate, today),
            ),
          )
          .limit(1);

        if (entryRows.length === 0) {
          return {
            kind: 'NO_ENTRY' as const,
          };
        }

        const entry = entryRows[0];

        /*
         * Claim resolution atomically.
         *
         * Only one concurrent request can change resolved_at
         * from NULL to a timestamp.
         *
         * If another request already resolved the day,
         * this update returns no rows.
         */
        const claimed = await tx
          .update(dailyCheckins)
          .set({
            resolvedAt: new Date(),
          })
          .where(
            and(
              eq(dailyCheckins.id, entry.id),
              eq(dailyCheckins.userId, userId),
              isNull(dailyCheckins.resolvedAt),
            ),
          )
          .returning();

        if (claimed.length === 0) {
          const attributeTransactions = await tx
            .select()
            .from(xpTransactions)
            .where(
              and(
                eq(xpTransactions.dailyCheckinId, entry.id),
                eq(xpTransactions.sourceType, 'ATTRIBUTE'),
              ),
            );

          const baseTransactions = await tx
            .select()
            .from(xpTransactions)
            .where(
              and(
                eq(xpTransactions.sourceType, 'DAILY_CHECKIN'),
                eq(xpTransactions.sourceId, entry.id),
              ),
            )
            .limit(1);

          const recoveryTransactions = await tx
            .select()
            .from(xpTransactions)
            .where(
              and(
                eq(xpTransactions.sourceType, 'RECOVERY'),
                eq(xpTransactions.sourceId, entry.id),
              ),
            )
            .limit(1);

          const attributeRows = await tx
            .select()
            .from(attributes)
            .where(eq(attributes.characterId, characterId));

          const attributeNames = new Map(
            attributeRows.map((attribute) => [
              attribute.id,
              attribute.name,
            ]),
          );

          const totalXp = [
            ...attributeTransactions,
            ...baseTransactions,
            ...recoveryTransactions,
          ].reduce((sum, transaction) => sum + transaction.amount, 0);

          return {
            kind: 'ALREADY_RESOLVED' as const,
            resolution: {
              totalXp,
              attributeAwards: attributeTransactions.map((transaction) => ({
                attributeId: transaction.sourceId,
                attributeName:
                  attributeNames.get(transaction.sourceId) ?? 'UNKNOWN',
                amount: transaction.amount,
              })),
              baseXp: baseTransactions[0]?.amount ?? 0,
              recoveryXp: recoveryTransactions[0]?.amount ?? 0,
              momentum: {
                from: entry.momentum,
                to: entry.momentum,
              },
            },
          };
        }

        const states = deserializeStates(entry.states);

        /*
         * Previous resolved day determines previous Momentum
         * and whether Recovery is eligible.
         */
        const previousRows = await tx
          .select()
          .from(dailyCheckins)
          .where(
            and(
              eq(dailyCheckins.userId, userId),
              lt(dailyCheckins.entryDate, today),
            ),
          )
          .orderBy(sql`${dailyCheckins.entryDate} DESC`)
          .limit(1);

        const previous = previousRows[0];
        const previousMomentum = previous?.momentum ?? 0;

        const nextMomentum = computeMomentumFromDay(
          previousMomentum,
          states,
        );

        /*
         * Small base reward for resolving the day.
         *
         * This rewards reflection/completion of the loop,
         * but most progression comes from actual domains.
         */
        const baseXp = 5;

        await tx.insert(xpTransactions).values({
          userId,
          characterId,
          amount: baseXp,
          sourceType: 'DAILY_CHECKIN',
          sourceId: entry.id,
          dailyCheckinId: entry.id,
        });

        const attributeAwards = new Map<
          string,
          {
            attributeId: string;
            attributeName: string;
            amount: number;
          }
        >();

        for (const [domainKey, state] of Object.entries(states)) {
          const typedDomain = domainKey as DailyDomainName;
          const typedState = state as DailyState;

          const xpPerAttribute = STATE_XP[typedState];

          if (xpPerAttribute <= 0) {
            continue;
          }

          const mappedAttributes =
            DOMAIN_TO_ATTRIBUTES[typedDomain] ?? [];

          for (const attributeName of mappedAttributes) {
            const attributeRows = await tx
              .select()
              .from(attributes)
              .where(
                and(
                  eq(attributes.characterId, characterId),
                  eq(attributes.name, attributeName),
                ),
              )
              .limit(1);

            if (attributeRows.length === 0) {
              continue;
            }

            const attribute = attributeRows[0];

            const currentAward = attributeAwards.get(attribute.id);

            if (currentAward) {
              currentAward.amount += xpPerAttribute;
            } else {
              attributeAwards.set(attribute.id, {
                attributeId: attribute.id,
                attributeName: attribute.name,
                amount: xpPerAttribute,
              });
            }
          }
        }

        /*
         * One ATTRIBUTE transaction per attribute per Daily Check-in.
         *
         * The DB unique index on
         * (daily_checkin_id, source_id)
         * prevents double-awarding.
         */
        for (const award of attributeAwards.values()) {
          await tx.insert(xpTransactions).values({
            userId,
            characterId,
            amount: award.amount,
            sourceType: 'ATTRIBUTE',
            sourceId: award.attributeId,
            dailyCheckinId: entry.id,
          });

          await tx
            .update(attributes)
            .set({
              value: sql`${attributes.value} + ${award.amount}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(attributes.id, award.attributeId),
                eq(attributes.characterId, characterId),
              ),
            );
        }

        /*
         * Minimal Recovery mechanic.
         *
         * Previous day must have been resolved and contain MISSED.
         * Today must contain at least three DONE domains.
         *
         * Small reward only.
         */
        let recoveryXp = 0;

        if (previous?.resolvedAt) {
          const previousStates = deserializeStates(previous.states);

          const previousHadMissed = Object.values(
            previousStates,
          ).some((state) => state === 'MISSED');

          const todayDoneCount = Object.values(states).filter(
            (state) => state === 'DONE',
          ).length;

          if (previousHadMissed && todayDoneCount >= 3) {
            recoveryXp = 5;

            await tx.insert(xpTransactions).values({
              userId,
              characterId,
              amount: recoveryXp,
              sourceType: 'RECOVERY',
              sourceId: entry.id,
              dailyCheckinId: entry.id,
            });
          }
        }

        await tx
          .update(dailyCheckins)
          .set({
            momentum: nextMomentum,
          })
          .where(
            and(
              eq(dailyCheckins.id, entry.id),
              eq(dailyCheckins.userId, userId),
            ),
          );

        const totalAttributeXp = Array.from(
          attributeAwards.values(),
        ).reduce((sum, award) => sum + award.amount, 0);

        return {
          kind: 'RESOLVED' as const,
          resolution: {
            totalXp: baseXp + totalAttributeXp + recoveryXp,

            attributeAwards: Array.from(
              attributeAwards.values(),
            ),

            baseXp,

            recoveryXp,

            momentum: {
              from: previousMomentum,
              to: nextMomentum,
            },
          },
        };
      });

      if (result.kind === 'NO_ENTRY') {
        return reply.code(400).send({
          error: {
            code: 'NO_DAILY_ENTRY',
          },
        });
      }

      return reply.code(200).send(result.resolution);
    },
  );
};

export default dailyRoutes;
