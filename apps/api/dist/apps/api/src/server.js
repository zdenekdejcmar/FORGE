import { buildApp } from './app.js';
import { config } from './config/env.js';
const start = async () => {
    const app = await buildApp();
    await app.listen({ port: config.port, host: '0.0.0.0' });
};
start().catch((error) => {
    console.error(error);
    process.exit(1);
});
