import { FastifyPluginAsync } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { journalEntries } from '../../../../../packages/db/src/schema';
import { journalDateSchema, journalSchema } from '../../../../../packages/validation/src/index';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/http.js';

const journalRoutes: FastifyPluginAsync = async (app) => {
  app.put('/:date', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = request.params as { date: string };
    const parsedDate = journalDateSchema.safeParse(params.date);
    if (!parsedDate.success) throw new ValidationError('Invalid journal date.');

    const parsedBody = journalSchema.safeParse(request.body);
    if (!parsedBody.success) throw new ValidationError('Invalid journal payload.');

    const date = parsedDate.data;
    const existing = await app.db.select().from(journalEntries).where(and(eq(journalEntries.userId, request.user!.id), eq(journalEntries.entryDate, date))).limit(1);

    const payload = {
      userId: request.user!.id,
      entryDate: date,
      built: parsedBody.data.built || null,
      burned: parsedBody.data.burned || null,
      protect: parsedBody.data.protect || null,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      const updated = await app.db.update(journalEntries).set(payload).where(eq(journalEntries.id, existing[0].id)).returning();
      reply.send(updated[0]);
      return;
    }

    const created = await app.db.insert(journalEntries).values(payload).returning();
    reply.code(201).send(created[0]);
  });

  app.get('/:date', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = request.params as { date: string };
    const parsed = journalDateSchema.safeParse(params.date);
    if (!parsed.success) throw new ValidationError('Invalid journal date.');

    const row = await app.db.select().from(journalEntries).where(and(eq(journalEntries.userId, request.user!.id), eq(journalEntries.entryDate, parsed.data))).limit(1);
    if (row.length === 0) throw new NotFoundError('JOURNAL_NOT_FOUND', 'Journal entry not found.');
    reply.send(row[0]);
  });

  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const rows = await app.db.select().from(journalEntries).where(eq(journalEntries.userId, request.user!.id)).orderBy(journalEntries.entryDate);
    reply.send(rows);
  });
};

export default journalRoutes;
