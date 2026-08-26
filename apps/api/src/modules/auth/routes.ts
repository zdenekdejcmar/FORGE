import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users } from '../../../../../packages/db/src/schema';
import { loginSchema, registerSchema } from '../../../../../packages/validation/src/index';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/http.js';
import { signToken } from '../../plugins/auth';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid registration payload.');
    }

    const { email, password } = parsed.data;
    const existing = await app.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw new ConflictError('EMAIL_ALREADY_EXISTS', 'An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await app.db.insert(users).values({ email, passwordHash }).returning({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    });

    const user = created[0];
    const token = signToken({ id: user.id, email: user.email });

    reply.code(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  });

  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid login payload.');
    }

    const { email, password } = parsed.data;
    const existing = await app.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length === 0) {
      throw new NotFoundError('USER_NOT_FOUND', 'No user found for that email.');
    }

    const match = await bcrypt.compare(password, existing[0].passwordHash);
    if (!match) {
      throw new ValidationError('Invalid email or password.');
    }

    const token = signToken({ id: existing[0].id, email: existing[0].email });
    reply.send({
      token,
      user: {
        id: existing[0].id,
        email: existing[0].email,
      },
    });
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const rows = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found.');
    }

    reply.send({
      user: {
        id: rows[0].id,
        email: rows[0].email,
      },
    });
  });
};

export default authRoutes;
