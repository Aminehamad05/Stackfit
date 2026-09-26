-- Career-path app: PostgreSQL schema (hackathon MVP)
-- Principle: content is a curated graph. AI proposes and reviews, humans approve,
-- and at runtime only rows with status = 'approved' are ever served.

CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector, for semantic matching

CREATE TYPE content_status AS ENUM ('draft', 'ai_reviewed', 'approved', 'rejected');
CREATE TYPE level_t        AS ENUM ('beginner', 'intermediate', 'advanced');

-- ========== 1. CURATED CONTENT GRAPH ==========

CREATE TABLE fields (                 -- ML, Cloud/DevOps, Security, Backend, ...
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE concepts (               -- atomic unit of knowledge: "TCP handshake", "Gradient descent"
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  level       level_t NOT NULL,
  embedding   vector(1024),           -- adjust to your embedding model's dimension
  status      content_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE concept_prerequisites (  -- edges of the graph: roadmap order comes from here
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  prereq_id  INT REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (concept_id, prereq_id),
  CHECK (concept_id <> prereq_id)
);

CREATE TABLE field_concepts (         -- what a field requires, and how much it matters
  field_id   INT REFERENCES fields(id) ON DELETE CASCADE,
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  importance SMALLINT NOT NULL CHECK (importance BETWEEN 1 AND 5),
  PRIMARY KEY (field_id, concept_id)
);

-- What users pick during onboarding: uni courses, skills, past experience
CREATE TABLE background_items (
  id   SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('uni_course', 'skill', 'experience')),
  name TEXT NOT NULL,
  UNIQUE (kind, name)
);

CREATE TABLE background_item_concepts (  -- "Linear algebra" covers these concepts
  item_id    INT REFERENCES background_items(id) ON DELETE CASCADE,
  concept_id INT REFERENCES concepts(id) ON DELETE CASCADE,
  strength   SMALLINT NOT NULL DEFAULT 3 CHECK (strength BETWEEN 1 AND 5),
  PRIMARY KEY (item_id, concept_id)
);

CREATE TABLE resources (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  provider    TEXT,                    -- 'YouTube', 'Coursera', ...
  type        TEXT NOT NULL CHECK (type IN ('video', 'course', 'book', 'article')),
  is_free     BOOLEAN NOT NULL,
  price_cents INT,                     -- NULL when free
  currency    TEXT,
  duration_min INT,
  level       level_t NOT NULL,
  language    TEXT NOT NULL DEFAULT 'en',
  verified_at TIMESTAMPTZ,             -- last time the link was checked
  status      content_status NOT NULL DEFAULT 'draft'
);

CREATE TABLE concept_resources (
  concept_id  INT REFERENCES concepts(id) ON DELETE CASCADE,
  resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
  rank        SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (concept_id, resource_id)
);

CREATE TABLE questions (              -- QCM bank
  id          SERIAL PRIMARY KEY,
  concept_id  INT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  stem        TEXT NOT NULL,
  difficulty  level_t NOT NULL,
  explanation TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('human', 'ai')),
  status      content_status NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE question_options (
  id          SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL
);
-- exactly one correct option per question
CREATE UNIQUE INDEX one_correct_option ON question_options(question_id) WHERE is_correct;

-- Audit trail of every AI review pass (what the model flagged, and which model)
CREATE TABLE ai_reviews (
  id          SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('question', 'resource', 'concept', 'roadmap')),
  entity_id   INT NOT NULL,
  model       TEXT NOT NULL,
  verdict     TEXT NOT NULL CHECK (verdict IN ('pass', 'fix', 'reject')),
  issues      JSONB,                   -- e.g. ["two options could be correct", "outdated"]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serve only approved content: the app queries these views, never the base tables
CREATE VIEW live_questions AS SELECT * FROM questions WHERE status = 'approved';
CREATE VIEW live_resources AS SELECT * FROM resources WHERE status = 'approved';
CREATE VIEW live_concepts  AS SELECT * FROM concepts  WHERE status = 'approved';

-- ========== 2. USERS & PROGRESS ==========

CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  city         TEXT,
  country      TEXT,
  budget_cents INT NOT NULL DEFAULT 0, -- 0 = free resources only
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

CREATE TABLE user_field_matches (     -- computed result of onboarding
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  field_id    INT REFERENCES fields(id) ON DELETE CASCADE,
  score       REAL NOT NULL,
  explanation TEXT,                    -- LLM-written "why this fits you"
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
  status      TEXT NOT NULL DEFAULT 'locked'
              CHECK (status IN ('locked', 'in_progress', 'quiz_passed', 'interview_passed')),
  PRIMARY KEY (roadmap_id, position)
);

CREATE TABLE quiz_attempts (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id INT NOT NULL REFERENCES concepts(id),
  answers    JSONB NOT NULL,           -- [{question_id, option_id}, ...]
  score      REAL NOT NULL,
  passed     BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE interviews (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_id INT NOT NULL REFERENCES concepts(id),
  transcript JSONB NOT NULL,
  scores     JSONB NOT NULL,           -- {technical, clarity, non_technical, feedback}
  model      TEXT NOT NULL,
  passed     BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 3. GAMIFICATION (append-only ledger) ==========

CREATE TABLE point_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('quiz', 'interview', 'course_completed', 'github_push', 'project')),
  points     INT NOT NULL,
  ref_id     TEXT,                     -- quiz id, commit sha, ... (also blocks double-counting)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, ref_id)
);

CREATE VIEW leaderboard AS
  SELECT u.id, u.display_name, COALESCE(SUM(p.points), 0) AS total_points
  FROM users u LEFT JOIN point_events p ON p.user_id = u.id
  GROUP BY u.id ORDER BY total_points DESC;

-- ========== 4. EVENTS & NETWORKING ==========

CREATE TABLE events (
  id        SERIAL PRIMARY KEY,
  title     TEXT NOT NULL,
  type      TEXT NOT NULL CHECK (type IN ('hackathon', 'networking', 'meetup', 'conference')),
  city      TEXT,
  country   TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at   TIMESTAMPTZ,
  url       TEXT
);

CREATE TABLE user_events (            -- events the user picked (feeds the "Add to Google Calendar" link)
  user_id  INT REFERENCES users(id) ON DELETE CASCADE,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, event_id)
);

-- Networking (phase 2): match users by chosen field, then add conversations/messages tables.
