# Schema fixes — what changed vs the raw drops and why

Source files: `schema(1).sql`, `schema_tasters(1).sql` → corrected into
`db/schema.sql`, `db/schema_tasters.sql`, `db/views.sql`, `prisma/schema.prisma`.
Prisma is the migration owner (`prisma migrate dev`); the `db/*.sql` files are the
reviewable reference + fallback for `psql`.

| # | Problem in the drops | Fix | Where |
|---|---|---|---|
| F1 | `clubs` table missing, yet API §6 needs `POST /clubs`, `GET /clubs/:id/events`. `events` had no `club_id`, no `status` (poster flow needs `draft → approved`, §7.5), no `location`/`description`, no field tag for `GET /events?field=` | Added `clubs`; `events.club_id → clubs`, `events.status draft/approved` (+ `live_events` view), `location`, `description`, `field_id → fields`, `ends_at >= starts_at` check | `db/schema.sql`, `prisma/schema.prisma` (Club/Event), `db/views.sql` |
| F2 | `users` had no password column, but §6 auth is JWT email/password | Added `users.password_hash` (bcrypt). On old DBs: backfill then `SET NOT NULL` | `db/schema.sql`, `prisma/schema.prisma` (User) |
| F3 | `point_events` CHECK patched by dropping `point_events_type_check` by auto-name — breaks if Postgres named it differently | Base CHECK includes `'taster'` up-front; tasters file keeps an idempotent `DO $$` guard (no-op on new DBs) | `db/schema.sql`, `db/schema_tasters.sql` |
| F4 | `embedding vector(1024)` needs pgvector but nothing pins it | Compose pins `pgvector/pgvector:pg16`; Prisma uses `Unsupported("vector(1024)")`; first migration runs `CREATE EXTENSION IF NOT EXISTS vector` | `docker-compose.yml`, `prisma/schema.prisma`, migration SQL |
| F5 | Views (`live_*`, `leaderboard`, `field_fit_inputs`) can't be owned by Prisma | Extracted to `db/views.sql` (`CREATE OR REPLACE`), re-applied post-migration; API reads views via `$queryRaw` | `db/views.sql` |
| F6 | `UNIQUE (user_id, type, ref_id)` silently allows duplicate `NULL` ref_ids (Postgres null-semantics) | Kept constraint + documented: code must always write deterministic `ref_id` (e.g. `quiz:<id>`) | `db/schema.sql` comment, Prisma `@@unique` |
| F7 | `interviews.transcript/scores NOT NULL` — a session row must exist *before* finish scoring | Nullable in both SQL + Prisma (`Json?`) | `db/schema.sql`, `prisma/schema.prisma` |
| F8 | `ai_reviews.entity_type` lacked `'taster'` though taster reviews are audited | Added `'taster'` | `db/schema.sql`, Prisma `AiReviewEntity` |
| F9 | `roadmap_steps.status` was `TEXT + CHECK` | Real `roadmap_step_status` enum | `db/schema.sql`, Prisma `RoadmapStepStatus` |
| F10 | No indexes on FK/hot columns (`questions.status`, `events.status`, prereq edges) | Added `idx_*` indexes | `db/schema.sql`, Prisma `@@index` |
| F11 | `question_options` one-correct rule is a partial unique index — Prisma can't express it | Kept raw `CREATE UNIQUE INDEX ... WHERE is_correct` in migration SQL; noted in Prisma model | migration SQL + model comment |
| F12 | `concept_prerequisites` self-reference allows indirect cycles (roadmap `buildRoadmap` throws on cycles) | Kept `concept <> prereq` CHECK; cycle detection stays in `matching.mjs` (seed bug = throw). Add a seed-time cycle check script before demo | `matching.mjs` (unchanged, copied verbatim) |

## Apply order
1. `docker compose up -d postgres` (fixed volume `careerpath_pgdata`)
2. `npx prisma migrate dev --schema prisma/schema.prisma` (creates extension + tables + partial index)
3. `psql $DATABASE_URL -f db/views.sql` (or `npm run db:views`)
4. `npm run db:seed` (3 fields, ~15 concepts each + prereqs, 1 taster/field per §8)
