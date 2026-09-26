-- schema_tasters.sql: patch to run AFTER schema.sql
-- Adds "taster" mini-projects: a short project per field that the user tries
-- before deciding which field to pursue.

-- ========== CONTENT (curated, reviewed like questions and resources) ==========

CREATE TABLE taster_projects (
  id               SERIAL PRIMARY KEY,
  field_id         INT NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  slug             TEXT UNIQUE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,          -- what the user builds and why it is a good taste of the field
  level            level_t NOT NULL DEFAULT 'beginner',
  est_hours        REAL NOT NULL CHECK (est_hours > 0),
  deliverable_type TEXT NOT NULL CHECK (deliverable_type IN ('github_repo', 'file_upload', 'text')),
  starter_repo_url TEXT,
  -- [{"id":"ci_runs","criterion":"A CI workflow runs the tests","weight":3,"how_to_check":"..."}]
  rubric           JSONB NOT NULL,
  status           content_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE taster_resources (          -- free resources the user follows for this taster
  taster_id   INT REFERENCES taster_projects(id) ON DELETE CASCADE,
  resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
  rank        SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (taster_id, resource_id)
);

CREATE TABLE taster_concepts (           -- concepts the project exercises
  taster_id  INT REFERENCES taster_projects(id) ON DELETE CASCADE,
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (taster_id, concept_id)
);

CREATE VIEW live_tasters AS SELECT * FROM taster_projects WHERE status = 'approved';

-- ========== USER SIDE ==========

-- One place for "what does this user know?", whatever the source.
-- Onboarding writes source='background'; a reviewed taster writes 'taster'; a passed QCM writes 'quiz'.
CREATE TABLE user_known_concepts (
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  source     TEXT NOT NULL CHECK (source IN ('background', 'taster', 'quiz')),
  strength   REAL NOT NULL CHECK (strength BETWEEN 0 AND 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id, source)
);

CREATE TABLE user_tasters (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taster_id       INT NOT NULL REFERENCES taster_projects(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'submitted', 'reviewed')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at    TIMESTAMPTZ,
  submission_url  TEXT,                    -- GitHub repo, etc.
  submission_text TEXT,                    -- README text or written summary
  -- reflection, filled by the user right after finishing
  enjoyment       SMALLINT CHECK (enjoyment BETWEEN 1 AND 5),
  difficulty      SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
  would_continue  BOOLEAN,
  reflection      TEXT,
  -- AI review (JSON matches prompts/review_taster.md) and its normalised score
  ai_review       JSONB,
  performance     REAL CHECK (performance BETWEEN 0 AND 1),
  UNIQUE (user_id, taster_id)
);

-- Inputs to the fit score: averages per user and field over reviewed tasters
CREATE VIEW field_fit_inputs AS
  SELECT ut.user_id,
         tp.field_id,
         COUNT(*)                         AS tasters_done,
         AVG(ut.enjoyment)                AS avg_enjoyment,   -- 1..5
         AVG(ut.performance)              AS avg_performance, -- 0..1
         AVG(ut.would_continue::int)      AS would_continue_rate
  FROM user_tasters ut
  JOIN taster_projects tp ON tp.id = ut.taster_id
  WHERE ut.status = 'reviewed' AND ut.enjoyment IS NOT NULL
  GROUP BY ut.user_id, tp.field_id;

-- ========== GAMIFICATION: allow taster points ==========
-- Postgres auto-names the inline CHECK on point_events.type as point_events_type_check.
ALTER TABLE point_events DROP CONSTRAINT point_events_type_check;
ALTER TABLE point_events ADD CONSTRAINT point_events_type_check
  CHECK (type IN ('quiz', 'interview', 'course_completed', 'github_push', 'project', 'taster'));
