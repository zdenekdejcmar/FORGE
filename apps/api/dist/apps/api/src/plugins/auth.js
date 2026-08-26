import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../shared/errors/http.js';
export const signToken = (user) => jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
export const verifyToken = (token) => {
    const payload = jwt.verify(token, config.jwtSecret);
    return { id: payload.sub, email: payload.email };
};
const authPlugin = fp(async (app) => {
    app.decorate('authenticate', async function (request, _reply) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError();
        }
        const token = authHeader.replace('Bearer ', '');
        try {
            request.user = verifyToken(token);
        }
        catch {
            throw new UnauthorizedError('Invalid or expired token.');
        }
    });
});
export default authPlugin;
