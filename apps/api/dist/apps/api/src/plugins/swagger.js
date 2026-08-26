import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
const swaggerPlugin = fp(async (app) => {
    await app.register(swagger, {
        openapi: {
            info: {
                title: 'FORGE API',
                version: '1.0.0',
            },
            servers: [{ url: 'http://localhost:3001' }],
        },
    });
    await app.register(swaggerUi, {
        routePrefix: '/docs',
    });
});
export default swaggerPlugin;
