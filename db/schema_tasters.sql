-- schema_tasters.sql: patch to run AFTER schema.sql (corrected).
-- Adds taster mini-projects. In the Prisma flow this file is REFERENCE —
-- `prisma migrate dev` owns the DDL. Keep them in sync.
--
-- Fix vs the original drop: the old file did
--   ALTER TABLE point_events DROP CONSTRAINT point_events_type_check;
--   ALTER TABLE ... ADD CONSTRAINT ... CHECK (type IN (..., 'taster'));
-- which breaks if Postgres auto-named the constraint differently. The corrected
-- db/schema.sql already includes 'taster', so this file keeps only a SAFE,
-- idempotent guard for databases created from the OLD base file.

-- ========== CONTENT (curated, reviewed like questions/resources) ==========

CREATE TABLE IF NOT EXISTS taster_projects (
  id               SERIAL PRIMARY KEY,
  field_id         INT NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  level            level_t NOT NULL DEFAULT 'beginner',
  est_hours        REAL NOT NULL CHECK (est_hours > 0),
  deliverable_type TEXT NOT NULL CHECK (deliverable_type IN ('github_repo', 'file_upload', 'text')),
  starter_repo_url TEXT,
  rubric           JSONB NOT NULL,
  status           content_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS taster_resources (
  taster_id   INT REFERENCES taster_projects(id) ON DELETE CASCADE,
  resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
  rank        SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (taster_id, resource_id)
);

CREATE TABLE IF NOT EXISTS taster_concepts (
  taster_id  INT REFERENCES taster_projects(id) ON DELETE CASCADE,
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (taster_id, concept_id)
);

-- ========== USER SIDE ==========

CREATE TABLE IF NOT EXISTS user_known_concepts (
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  source     TEXT NOT NULL CHECK (source IN ('background', 'taster', 'quiz')),
  strength   REAL NOT NULL CHECK (strength BETWEEN 0 AND 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id, source)
);

CREATE TABLE IF NOT EXISTS user_tasters (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taster_id       INT NOT NULL REFERENCES taster_projects(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'submitted', 'reviewed')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at    TIMESTAMPTZ,
  submission_url  TEXT,
  submission_text TEXT,
  enjoyment       SMALLINT CHECK (enjoyment BETWEEN 1 AND 5),
  difficulty      SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
  would_continue  BOOLEAN,
  reflection      TEXT,
  ai_review       JSONB,
  performance     REAL CHECK (performance BETWEEN 0 AND 1),
  UNIQUE (user_id, taster_id)
);

-- ========== GAMIFICATION: allow taster points (SAFE no-op on corrected DBs) ==========
-- Only touches DBs built from the OLD schema.sql whose CHECK lacks 'taster'.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'point_events_type_check'
      AND pg_get_constraintdef(oid) NOT LIKE '%taster%'
  ) THEN
    ALTER TABLE point_events DROP CONSTRAINT point_events_type_check;
    ALTER TABLE point_events ADD CONSTRAINT point_events_type_check
      CHECK (type IN ('quiz', 'interview', 'course_completed', 'github_push', 'project', 'taster'));
  END IF;
END $$;

-- Views (live_tasters, field_fit_inputs) live in db/views.sql — run it after this file.
