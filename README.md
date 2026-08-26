# FORGE

> Turn real-world goals into quests, skills and measurable character progression.

FORGE is a personal progression RPG built around the loop: real-world action -> quest completion -> XP transaction -> arena progression -> character progression.

## Product concept

This sprint delivers the first production-quality vertical slice of the core loop: create a character, create arenas, create quests, complete them, and see XP translate into a visible level-up experience without a full page refresh.

## Stack

- React + Vite + TypeScript
- Fastify + TypeScript
- PostgreSQL + Drizzle ORM
- pnpm workspaces
- Vitest + Testing Library

## Repository structure

- apps/web: React frontend
- apps/api: Fastify backend
- packages/domain: framework-independent domain logic
- packages/db: migration and seed tooling
- packages/validation: Zod schemas
- docs: ADRs and architecture notes

## Getting started

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Environment setup

Create a .env file at the repo root using .env.example as the template.

```bash
cp .env.example .env
```

## Database startup

```bash
docker compose up -d
```

## Migrations and seed

```bash
pnpm db:migrate
pnpm db:seed
```

## Running apps

```bash
pnpm dev
```

## Tests

```bash
pnpm test
```

## API docs

The API exposes Swagger at `/docs` when the server is running.

## Current scope

- Authentication and identity
- Character creation
- Arena lifecycle
- Quest creation and completion
- Idempotent XP rewards
- Journal entry flow
- Progression views and dashboard

## Non-goals

- Blizzard/Battle.net integration
- social systems
- guilds or leaderboards
- AI recommendations
- admin panels
- file uploads

## License

License TBD.
