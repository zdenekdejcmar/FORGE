import 'dotenv/config';
export const config = {
    port: Number(process.env.PORT ?? 3001),
    jwtSecret: process.env.JWT_SECRET ?? 'development-secret',
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://forge:forge@localhost:5432/forge',
    nodeEnv: process.env.NODE_ENV ?? 'development',
};
