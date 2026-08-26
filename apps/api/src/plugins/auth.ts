import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../shared/errors/http.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
    };
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export type AuthUser = {
  id: string;
  email: string;
};

export const signToken = (user: AuthUser) =>
  jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });

export const verifyToken = (token: string) => {
  const payload = jwt.verify(token, config.jwtSecret) as { sub: string; email: string };
  return { id: payload.sub, email: payload.email };
};

const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      request.user = verifyToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired token.');
    }
  });
});

export default authPlugin;
