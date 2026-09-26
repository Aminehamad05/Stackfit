-- CareerPath — corrected base schema (Postgres + pgvector).
-- Apply order: 1) db/schema.sql  2) db/schema_tasters.sql  3) db/views.sql
-- In Docker/Prisma flow this file is REFERENCE: `npx prisma migrate dev`
-- generates the real migration from prisma/schema.prisma. Keep them in sync.
--
-- Fixes vs the original drop (see SCHEMA_FIXES.md):
--   F2 users.password_hash (JWT auth) | F1 clubs table + events.club_id/status/location/description/field_id
--   F4 point_events.type includes 'taster' up-front (no later ALTER hack)
--   F8 interviews.transcript/scores nullable | F9 ai_reviews entity includes 'taster'
--   F10 roadmap_step_status enum | F11 FK indexes | F12 partial unique index kept

CREATE EXTENSION IF NOT EXISTS vector; -- pgvector; compose uses pgvector/pgvector:pg16

CREATE TYPE content_status AS ENUM ('draft', 'ai_reviewed', 'approved', 'rejected');
CREATE TYPE level_t        AS ENUM ('beginner', 'intermediate', 'advanced');
-- F10: roadmap step lifecycle as a real enum (was TEXT + CHECK)
CREATE TYPE roadmap_step_status AS ENUM ('locked', 'in_progress', 'quiz_passed', 'interview_passed');

-- ========== 1. CURATED CONTENT GRAPH ==========

CREATE TABLE fields (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE concepts (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  level       level_t NOT NULL,
  embedding   vector(1024),
  status      content_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE concept_prerequisites (
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  prereq_id  INT REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (concept_id, prereq_id),
  CHECK (concept_id <> prereq_id)
);
CREATE INDEX idx_concept_prereqs_concept ON concept_prerequisites(concept_id); -- F11
CREATE INDEX idx_concept_prereqs_prereq  ON concept_prerequisites(prereq_id);  -- F11

CREATE TABLE field_concepts (
  field_id   INT REFERENCES fields(id) ON DELETE CASCADE,
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  importance SMALLINT NOT NULL CHECK (importance BETWEEN 1 AND 5),
  PRIMARY KEY (field_id, concept_id)
);
CREATE INDEX idx_field_concepts_field   ON field_concepts(field_id);   -- F11
CREATE INDEX idx_field_concepts_concept ON field_concepts(concept_id); -- F11

CREATE TABLE background_items (
  id   SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('uni_course', 'skill', 'experience')),
  name TEXT NOT NULL,
  UNIQUE (kind, name)
);

CREATE TABLE background_item_concepts (
  item_id    INT REFERENCES background_items(id) ON DELETE CASCADE,
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  strength   SMALLINT NOT NULL DEFAULT 3 CHECK (strength BETWEEN 1 AND 5),
  PRIMARY KEY (item_id, concept_id)
);

CREATE TABLE resources (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  provider    TEXT,
  type        TEXT NOT NULL CHECK (type IN ('video', 'course', 'book', 'article')),
  is_free     BOOLEAN NOT NULL,
  price_cents INT,
  currency    TEXT,
  duration_min INT,
  level       level_t NOT NULL,
  language    TEXT NOT NULL DEFAULT 'en',
  verified_at TIMESTAMPTZ,
  status      content_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE concept_resources (
  concept_id  INT REFERENCES concepts(id) ON DELETE CASCADE,
  resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
  rank        SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (concept_id, resource_id)
);

CREATE TABLE questions (
  id          SERIAL PRIMARY KEY,
  concept_id  INT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  stem        TEXT NOT NULL,
  difficulty  level_t NOT NULL,
  explanation TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('human', 'ai')),
  status      content_status NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_concept ON questions(concept_id); -- F11
CREATE INDEX idx_questions_status  ON questions(status);     -- F11 (live_* reads)

CREATE TABLE question_options (
  id          SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL
);
CREATE INDEX idx_question_options_q ON question_options(question_id); -- F11
-- F12: exactly one correct option per question (partial unique index — keep verbatim; Prisma can't express it)
CREATE UNIQUE INDEX one_correct_option ON question_options(question_id) WHERE is_correct;

CREATE TABLE ai_reviews (
  id          SERIAL PRIMARY KEY,
  -- F9: added 'taster' (taster reviews are audited too)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('question', 'resource', 'concept', 'roadmap', 'taster')),
  entity_id   INT NOT NULL,
  model       TEXT NOT NULL,
  verdict     TEXT NOT NULL CHECK (verdict IN ('pass', 'fix', 'reject')),
  issues      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_reviews_entity ON ai_reviews(entity_type, entity_id); -- F11

-- ========== 2. USERS & PROGRESS ==========

CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- F2: JWT email/password auth (spec §6). Backfill existing rows with '!' before adding NOT NULL on old DBs.
  display_name TEXT NOT NULL,
  city         TEXT,
  country      TEXT,
  budget_cents INT NOT NULL DEFAULT 0,
  github_login TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_background (
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  item_id    INT REFERENCES background_items(id) ON DELETE CASCADE,
  confidence SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  interest   SMALLINT NOT NULL CHECK (interest   BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE user_field_matches (
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  field_id    INT REFERENCES fields(id) ON DELETE CASCADE,
  score       REAL NOT NULL,
  explanation TEXT,
  chosen      BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, field_id)
);

CREATE TABLE roadmaps (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_id   INT NOT NULL REFERENCES fields(id),
  include_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roadmap_steps (
  roadmap_id  INT REFERENCES roadmaps(id) ON DELETE CASCADE,
  position    INT NOT NULL,
  concept_id  INT NOT NULL REFERENCES concepts(id),
  resource_id INT REFERENCES resources(id),
  status      roadmap_step_status NOT NULL DEFAULT 'locked', -- F10
  PRIMARY KEY (roadmap_id, position)
);

CREATE TABLE quiz_attempts (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id INT NOT NULL REFERENCES concepts(id),
  answers    JSONB NOT NULL,
  score      REAL NOT NULL,
  passed     BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE interviews (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id INT NOT NULL REFERENCES concepts(id),
  transcript JSONB, -- F8: nullable, session exists before finish scoring
  scores     JSONB, -- F8: {technical, clarity, non_technical, feedback}
  model      TEXT NOT NULL,
  passed     BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 3. GAMIFICATION (append-only ledger) ==========

CREATE TABLE point_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- F4: 'taster' included up-front; schema_tasters.sql keeps a safe no-op guard for old DBs
  type       TEXT NOT NULL CHECK (type IN ('quiz', 'interview', 'course_completed', 'github_push', 'project', 'taster')),
  points     INT NOT NULL,
  ref_id     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, ref_id)
  -- NOTE (F7): Postgres treats NULL ref_id as distinct, so always write a
  -- deterministic ref_id (e.g. 'quiz:<attemptId>') from code to keep idempotency.
);

-- ========== 4. EVENTS & NETWORKING (F1 fixes) ==========

-- F1: clubs table was missing entirely (API: POST /clubs, GET /clubs/:id/events)
CREATE TABLE clubs (
  id            SERIAL PRIMARY KEY,
  name          TEXT UNIQUE NOT NULL,
  description   TEXT,
  contact_email TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('hackathon', 'networking', 'meetup', 'conference')),
  city        TEXT,
  country     TEXT NOT NULL,
  location    TEXT, -- F1: venue/address from poster extraction
  description TEXT, -- F1
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ,
  url         TEXT, -- registration URL
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')), -- F1: draft until organizer confirms
  club_id     INT REFERENCES clubs(id) ON DELETE SET NULL, -- F1
  field_id    INT REFERENCES fields(id) ON DELETE SET NULL, -- F1: tagged field for GET /events?field=
  CONSTRAINT events_ends_after_starts CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX idx_events_status ON events(status); -- F1/F11 (approved-only reads)
CREATE INDEX idx_events_club   ON events(club_id); -- F11

CREATE TABLE user_events (
  user_id  INT REFERENCES users(id) ON DELETE CASCADE,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, event_id)
);

-- Views live in db/views.sql (applied after both schema files / post-migration).
-- Networking phase 2 (conversations/messages) intentionally not created — mockup screen per spec §8.
