import 'dotenv/config';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://forge:forge@localhost:5432/forge';

const client = new Client({
  connectionString: DATABASE_URL,
});

const migrationSql = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  title text,
  archetype text,
  avatar_url text,
  lore text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arenas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  description text,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  arena_id uuid NOT NULL REFERENCES arenas(id),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (
    type IN (
      'DAILY',
      'WEEKLY',
      'SIDE',
      'MAIN',
      'BOSS',
      'MAINTENANCE',
      'RECOVERY',
      'EXPLORATION'
    )
  ),
  difficulty text NOT NULL CHECK (
    difficulty IN (
      'TRIVIAL',
      'EASY',
      'NORMAL',
      'HARD',
      'EPIC',
      'BOSS'
    )
  ),
  xp_reward integer NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN (
      'DRAFT',
      'ACTIVE',
      'COMPLETED',
      'ABANDONED'
    )
  ),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL UNIQUE REFERENCES quests(id),
  user_id uuid NOT NULL REFERENCES users(id),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id),
  name text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  character_id uuid NOT NULL REFERENCES characters(id),
  entry_date text NOT NULL,
  states text,
  momentum integer NOT NULL DEFAULT 0,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

ALTER TABLE IF EXISTS daily_checkins
  ADD COLUMN IF NOT EXISTS states text;

ALTER TABLE IF EXISTS daily_checkins
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user
  ON daily_checkins(user_id);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  character_id uuid NOT NULL REFERENCES characters(id),
  arena_id uuid REFERENCES arenas(id),
  quest_id uuid REFERENCES quests(id),
  amount integer NOT NULL,
  source_type text NOT NULL CHECK (
    source_type IN (
      'QUEST_COMPLETION',
      'ATTRIBUTE',
      'DAILY_CHECKIN',
      'REBIRTH',
      'MOMENTUM',
      'FAIR_ENEMY',
      'RECOVERY'
    )
  ),
  source_id uuid NOT NULL,
  daily_checkin_id uuid REFERENCES daily_checkins(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS xp_transactions
  ADD COLUMN IF NOT EXISTS daily_checkin_id uuid REFERENCES daily_checkins(id);

ALTER TABLE IF EXISTS xp_transactions
  DROP CONSTRAINT IF EXISTS xp_transactions_source_type_source_id_key;

DROP INDEX IF EXISTS xp_transactions_source_type_source_id_key;

ALTER TABLE IF EXISTS xp_transactions
  DROP CONSTRAINT IF EXISTS xp_transactions_source_type_check;

ALTER TABLE IF EXISTS xp_transactions
  ADD CONSTRAINT xp_transactions_source_type_check
  CHECK (
    source_type IN (
      'QUEST_COMPLETION',
      'ATTRIBUTE',
      'DAILY_CHECKIN',
      'REBIRTH',
      'MOMENTUM',
      'FAIR_ENEMY',
      'RECOVERY'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_quest_reward_unique
  ON xp_transactions(source_id)
  WHERE source_type = 'QUEST_COMPLETION';

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_daily_attr_unique
  ON xp_transactions(daily_checkin_id, source_id)
  WHERE source_type = 'ATTRIBUTE'
    AND daily_checkin_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_dailycheckin_unique
  ON xp_transactions(source_type, source_id)
  WHERE source_type = 'DAILY_CHECKIN';

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_recovery_unique
  ON xp_transactions(source_type, source_id)
  WHERE source_type = 'RECOVERY';

CREATE TABLE IF NOT EXISTS rebirths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  character_id uuid NOT NULL REFERENCES characters(id),
  rebirth_type text,
  metadata text,
  rebirth_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fair_enemies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  character_id uuid NOT NULL REFERENCES characters(id),
  entry_date text NOT NULL,
  name text NOT NULL,
  difficulty text NOT NULL CHECK (
    difficulty IN (
      'NORMAL',
      'HARD',
      'EPIC'
    )
  ),
  primary_attribute text,
  xp_reward integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN (
      'ACTIVE',
      'DEFEATED',
      'ABANDONED'
    )
  ),
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fair_enemies_unique_day
  ON fair_enemies(character_id, entry_date);

CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  entry_date text NOT NULL,
  built text,
  burned text,
  protect text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_quests_user_status
  ON quests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_quests_arena
  ON quests(arena_id);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user
  ON xp_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_character
  ON xp_transactions(character_id);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_quest
  ON xp_transactions(quest_id);
`;

async function main() {
  await client.connect();
  await client.query(migrationSql);
  console.log('Migrations applied.');
  await client.end();
}

main().catch(async (error) => {
  console.error(error);

  try {
    await client.end();
  } catch {
    // Ignore cleanup failure after migration error.
  }

  process.exit(1);
});