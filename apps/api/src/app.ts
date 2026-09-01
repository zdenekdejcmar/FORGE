import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/auth.js';
import dbPlugin from './plugins/db.js';
import swaggerPlugin from './plugins/swagger.js';
import { setupErrorHandler } from './shared/http/error-handler.js';
import authRoutes from './modules/auth/routes.js';
import characterRoutes from './modules/character/routes.js';
import arenaRoutes from './modules/arenas/routes.js';
import questRoutes from './modules/quests/routes.js';
import progressionRoutes from './modules/progression/routes.js';
import journalRoutes from './modules/journal/routes.js';
import attributeRoutes from './modules/attributes/routes.js';
import dailyRoutes from './modules/daily/routes.js';
import rebirthRoutes from './modules/rebirths/routes.js';
import fairRoutes from './modules/fairEnemies/routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'production',
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(swaggerPlugin);

  app.register(authRoutes, { prefix: '/auth' });
  app.register(characterRoutes, { prefix: '/character' });
  app.register(arenaRoutes, { prefix: '/arenas' });
  app.register(questRoutes, { prefix: '/quests' });
  app.register(progressionRoutes, { prefix: '/progress' });
  app.register(journalRoutes, { prefix: '/journal' });
  app.register(attributeRoutes, { prefix: '/attributes' });
  app.register(dailyRoutes, { prefix: '/daily' });
  app.register(rebirthRoutes, { prefix: '/rebirths' });
  app.register(fairRoutes, { prefix: '/fair-enemies' });

  setupErrorHandler(app);

  return app;
}
