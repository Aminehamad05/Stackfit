# CareerPath — Agent Implementation Spec

Hackathon MVP. This document is the single source of truth for a coding agent
implementing the project. Read it fully before writing code. Build in the
phase order given at the end — do not jump ahead to "should have" items while
"must have" items are incomplete.

---

## 1. Concept

An app for CS students and career switchers that helps them pick a tech
field and prove they understand it, instead of endlessly browsing courses.

**Core loop:**

1. **Background.** User selects uni courses / skills / past experience they
   have (e.g. "Linear Algebra", "Linux", "Git & GitHub").
2. **Candidate fields.** The app scores tech fields (Data Analysis, DevOps,
   Machine Learning, ...) against that background and returns the top 3.
3. **Tasters.** For each candidate field, the user does a short (1–3h) hands-on
   project using free resources (e.g. a small data-analysis notebook, a
   Bash automation script, a CI pipeline). They submit it, reflect on how
   much they enjoyed it, and an AI review scores it against a rubric.
4. **Field choice.** A fit score combines skill match, enjoyment and taster
   performance. The user makes the final choice — the score only informs it.
5. **Roadmap.** For the chosen field, missing concepts are ordered by
   prerequisite (a topological sort) into a roadmap, each step backed by a
   curated free (or, if the user opts in, paid) resource.
6. **QCM gate.** Each roadmap step is unlocked by passing a quiz on that
   concept, pulled from a curated, AI-reviewed question bank.
7. **AI interview.** Periodically, the user does a text (or voice) interview
   with an AI agent that checks technical understanding AND the ability to
   explain the concept to a non-technical person (simulating talking to a
   stakeholder/client).
8. **Gamification.** Points from quizzes, tasters, course completion and
   GitHub activity feed a leaderboard.
9. **Networking / events.** A portal where university clubs post events
   (hackathons, meetups); students browse/follow and add events to their
   calendar. (MVP: DB is seeded with mock events + a club submission portal —
   no live Instagram/Facebook sync, see §7.)

**Design principle:** content (concepts, questions, resources, tasters,
events) lives in a curated, versioned database. The AI drafts and reviews it
offline (`status: draft → ai_reviewed → approved`); the running app only ever
reads `approved` rows. The AI never decides field-matching or roadmap order
live — that's deterministic code over the DB graph (§4). The AI's live-path
jobs are: (a) interviewer, (b) taster review, (c) "why this fits you" text,
(d) poster→event extraction.

---

## 2. Tech stack

- **DB:** PostgreSQL + `pgvector` extension (for future semantic matching;
  not required for MVP logic).
- **API:** Node.js + Express (swap for FastAPI only if the team is stronger
  in Python — pick one and don't mix).
- **Web:** React (Vite).
- **Worker:** Node script(s) for the content factory (question/taster
  generation + AI review) and poster→event extraction. Runs outside the
  request path.
- **LLM access:** one OpenAI-compatible client wrapping NVIDIA Build
  (`https://integrate.api.nvidia.com/v1`) as the default, swappable via env
  vars to a Brev-hosted vLLM/NIM endpoint for demo day. Never hardcode a
  base URL or model name outside config.
- **Containerization:** Docker Compose (`web`, `api`, `worker`, `postgres`)
  so the whole team runs the same stack and the API can be pointed at a
  Brev box for the demo with one env change.

### Environment variables (`.env`, never commit)

```
DATABASE_URL=postgres://...
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_API_KEY=...
LLM_MODEL_CHAT=<catalog model id>          # interviewer conversation turns
LLM_MODEL_REVIEW=<catalog model id>        # taster review, question generation, scoring
LLM_MODEL_VISION=<catalog vision model id> # poster -> event extraction
JWT_SECRET=...
```

---

## 3. Project structure

```
careerpath/
├─ apps/
│  ├─ web/                       # React (Vite)
│  │  └─ src/
│  │     ├─ pages/
│  │     │  ├─ Onboarding/       # background picker -> top-3 fields
│  │     │  ├─ Taster/           # taster instructions, submission, reflection
│  │     │  ├─ FieldChoice/      # fit-score comparison, final pick
│  │     │  ├─ Roadmap/          # ordered concept steps
│  │     │  ├─ Quiz/             # QCM runner
│  │     │  ├─ Interview/        # chat (or voice) with the AI interviewer
│  │     │  ├─ Leaderboard/
│  │     │  └─ Events/           # browse events, club portal
│  │     └─ lib/api.ts           # thin fetch client to apps/api
│  └─ api/
│     ├─ modules/
│     │  ├─ auth/
│     │  ├─ background/          # CRUD for background_items, user_background
│     │  ├─ matching/            # wraps matching.mjs logic (see §4)
│     │  ├─ tasters/             # start/submit taster, trigger AI review
│     │  ├─ roadmap/
│     │  ├─ quiz/                # serve live_questions, grade attempts
│     │  ├─ interview/           # interview session + scoring
│     │  ├─ points/              # point_events writes, leaderboard view
│     │  └─ events/              # clubs, events, submissions, calendar links
│     ├─ llm/
│     │  ├─ client.js            # OpenAI-compatible client, base URL from env
│     │  └─ prompts/             # review_taster.md, review_question.md,
│     │                          # interview_system.md, event_extraction.md
│     └─ matching/matching.mjs   # pure logic, see §4 — copy verbatim, no DB calls inside it
├─ db/
│  ├─ schema.sql                 # §5, part A
│  ├─ schema_tasters.sql         # §5, part B (run after schema.sql)
│  └─ seed/                      # fields.json, concepts.json, resources.json,
│                                 # questions.json, tasters.json, clubs.json, events.json
├─ scripts/
│  ├─ generate-questions.js      # LLM drafts QCMs per concept -> status draft
│  ├─ review-content.js          # LLM critiques drafts -> ai_reviewed / flagged
│  └─ check-links.js             # verify resource URLs resolve
├─ docker-compose.yml
└─ README.md
```

---

## 4. Matching & roadmap logic

This logic is **pure, dependency-free, deterministic code** — no LLM call in
the hot path. Implement exactly as below (already written and demo-tested;
copy into `apps/api/matching/matching.mjs`):

- `knownAndLiked(background, itemConcepts)` — turns the user's rated
  background items into per-concept "known" (0–1) and "liked" (0–1) maps.
- `rankFields(fields, known, liked, topN=3)` — importance-weighted score per
  field = `0.6 * skillMatch + 0.4 * interestMatch`; returns top N with a
  `relativeScore` (best field = 1.0).
- `fitScore(relativeSkill, tasterInputs)` — after a taster is reviewed:
  `fit = 0.2*skill + 0.5*enjoyment + 0.3*performance`. **A field with no
  completed taster returns `fit: null` ("not tried yet") — never compare an
  untried field's score against a tried one.**
- `buildRoadmap(field, concepts, prereqs, known)` — collects the field's
  missing required concepts plus their missing prerequisites (DFS), then
  topologically sorts them (Kahn's algorithm) so prerequisites always come
  first; ties break by lower level, then higher importance. Throws if
  `concept_prerequisites` seed data has a cycle — treat that as a seed bug.

Weights (`MATCH_WEIGHTS`, `FIT_WEIGHTS`, `KNOWN_THRESHOLD = 0.5`) are named
constants at the top of the file — tune after real testing, don't hardcode
elsewhere.

The API layer's job is only: load rows from Postgres → call these functions
→ persist results (`user_field_matches`, `roadmap_steps`) → call the LLM
*only* to generate the "why this field fits you" explanation text from
`matchedConcepts`, never to decide the score itself.

---

## 5. Database schema

Run `db/schema.sql` then `db/schema_tasters.sql`. Full DDL below (also
provided as standalone files).

<details>
<summary>schema.sql + schema_tasters.sql (combined, click to expand in your editor — paste as two files)</summary>

```sql
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
```
</details>

---

## 6. API endpoints (MVP)

All routes under `/api`. Auth via JWT (simple email/password is fine for a
hackathon). Every list/detail read hits the `live_*` views (approved content
only) — never the base `concepts`/`questions`/`resources`/`taster_projects`
tables directly from a user-facing route.

```
POST   /auth/register            /auth/login

GET    /background-items          list selectable courses/skills
POST   /users/me/background        [{itemId, confidence, interest}, ...]

POST   /users/me/field-matches/compute   -> runs matching.mjs, writes user_field_matches
GET    /users/me/field-matches           -> top-3 fields + LLM "why this fits" text

GET    /fields/:id/taster                -> live taster project + resources + rubric
POST   /users/me/tasters/:tasterId/start
POST   /users/me/tasters/:tasterId/submit   {submissionUrl, submissionText, enjoyment, difficulty, wouldContinue, reflection}
                                          -> triggers AI review (prompts/review_taster.md), writes ai_review + performance,
                                             on pass: inserts user_known_concepts + point_events(type='taster')
GET    /users/me/field-fit               -> fitScore() per candidate field

POST   /users/me/field-choice            {fieldId}  -> creates roadmaps row

GET    /roadmaps/:id                     -> ordered steps (buildRoadmap output, persisted)
GET    /concepts/:id/quiz                -> N questions from live_questions
POST   /concepts/:id/quiz/attempt        {answers:[{questionId,optionId}]}
                                          -> grades, writes quiz_attempts, on pass: unlocks next
                                             roadmap step + point_events(type='quiz')

POST   /interviews                       {conceptId} -> starts session (system prompt +
                                          taster's interview_questions if available)
POST   /interviews/:id/message           {text} -> appends turn, returns AI reply
POST   /interviews/:id/finish            -> final scoring JSON {technical, clarity,
                                          non_technical, feedback}, writes interviews,
                                          on pass: point_events(type='interview')

GET    /leaderboard

GET    /clubs                GET /clubs/:id/events
POST   /clubs                 (portal: create a club)
POST   /clubs/:id/events      (portal: submit event; manual form OR poster upload ->
                               event_extraction.md pre-fills the form, status='draft'
                               until organizer confirms -> 'approved')
GET    /events?field=&city=   -> approved events, optionally filtered by tagged field
GET    /events/:id/ics        -> .ics download
GET    /events/:id/gcal-link  -> Google Calendar "render" template URL (no OAuth)
```

---

## 7. LLM prompts (worker + interview)

Store each as a markdown file under `apps/api/llm/prompts/`. Keep system
prompt and output JSON schema together in the same file, same pattern for
all four:

1. **`review_taster.md`** — already written (see project files). Scores a
   submitted taster against its rubric; treats submission content strictly
   as data (flags `prompt_injection_attempt` if the submission tries to
   redirect the reviewer); returns per-criterion results, an
   `explanation_quality` score, and 2–3 `interview_questions` to hand to the
   interviewer. **Compute the final `performance` number in code** from the
   per-criterion results — don't trust the model's own `overall_score`.

2. **`generate_question.md`** *(write next)* — input: one concept + its
   description/level; output: one QCM `{stem, options:[{text,isCorrect}],
   explanation}` with exactly one correct option. Batch-generate offline via
   `scripts/generate-questions.js`, write with `status='draft'`.

3. **`review_question.md`** *(write next)* — input: a drafted question;
   output: `{verdict: pass|fix|reject, issues:[...]}`. Checks: exactly one
   defensibly correct option, no ambiguity, explanation is accurate, matches
   the concept's level. Run via `scripts/review-content.js`; only `pass`
   moves a row to `approved` (human spot-checks a sample before demo day).

4. **`interview_system.md`** *(write next)* — the interviewer persona.
   Two-part rubric per turn/session: (a) technical correctness on the
   concept, (b) could a non-technical stakeholder follow this explanation.
   Feed in any `interview_questions` from a related taster review. Output a
   structured `{technical, clarity, non_technical, feedback, passed}` on
   `finish`.

5. **`event_extraction.md`** *(write next, vision model)* — input: poster
   image (or caption text) + club name; output:
   `{title, startsAt, endsAt, location, type, registrationUrl, confidence:{...per field 0-1}}`.
   Low-confidence fields must be visibly flagged in the UI for the organizer
   to fix before the event can move from `draft` to `approved`. Never
   auto-publish an extracted event.

**Events/networking note:** official Instagram/Facebook APIs only expose
data for accounts you manage (or, narrowly, Business Discovery on public
Business/Creator accounts) and require app review — do not build automatic
scraping of club social posts for the MVP. Ship: mock/seeded events + a club
portal where organizers paste a caption or upload a poster image and the
extractor pre-fills the form (§7.5) for one-click confirm. Pitch live
Instagram sync as a phase-2 item, not something demoed as working.

---

## 8. Definition of done — MVP

**Must have (the demo path, build in this order):**
1. `db/schema.sql` + `db/schema_tasters.sql` applied; seed data loaded for
   3 fields, ~15 concepts each with prerequisites, 1 taster per field.
2. Onboarding → `rankFields` → top-3 fields with LLM "why this fits" text.
3. Taster flow: start → submit → AI review → `fitScore` comparison → user
   picks a field.
4. Roadmap generated (`buildRoadmap`) with real free resources per step.
5. QCM gate unlocking each step, from `live_questions` only.
6. AI interview with a visible structured score.
7. Points ledger + leaderboard.

**Should have:** event tracker (seeded events + club portal + poster
extraction + review queue), budget filter on paid resources.

**Mock/cut:** GitHub-push points (one API call or a hardcoded demo value),
networking chat (mockup screen, present as phase 2), Google Calendar OAuth
sync (use the template-URL / .ics approach instead), voice interview (only
if time remains).

**Before the demo:** run the full happy path end-to-end at least once from
a clean seeded DB; keep an env-var fallback from NVIDIA Build to a Brev
instance in case the shared compute pool is rate-limited during judging.
