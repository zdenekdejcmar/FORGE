import fp from 'fastify-plugin';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/env.js';
const { Pool } = pg;
const dbPlugin = fp(async (app) => {
    const pool = new Pool({ connectionString: config.databaseUrl });
    const db = drizzle(pool, { logger: config.nodeEnv === 'development' });
    app.decorate('db', db);
    app.addHook('onClose', async () => {
        await pool.end();
    });
});
export default dbPlugin;
