# CareerPath — hackathon MVP

CS students pick a tech field and prove they understand it. Single source of truth: `AGENT_SPEC(1).md`.

## Stack
TypeScript (strict) · Postgres 16 + pgvector · Node 20 + Express (`apps/api`) ·
React + Vite (`apps/web`) · Zod request validation · Prisma migrations ·
Docker Compose (`web`, `api`, `worker`, `postgres`).

> **AI layer: DISABLED.** The app is fully independent of any LLM provider —
> no `openai` dependency, no LLM imports anywhere. AI-backed endpoints
> (`POST /api/interviews/*`) return `503 ai_disabled`; AI scripts exit with a
> SKIP message. Re-enable via `apps/api/src/ai/` + `AI_ENABLED=true`.

## Quickstart (teammates: one command)
```bash
git clone <repo> && cd <repo>
docker compose up --build
```
That's it — no `.env` needed for the compose path (sane defaults kick in).
First boot does everything automatically: `postgres` starts on the fixed
volume → `api` runs `migrate deploy`, then `bootstrap` (creates the 7 views,
seeds all content **only if the DB is empty**), then serves. Open
http://localhost:5173 (web) — API at http://localhost:4000/api.
Copy `.env.example` → `.env` only if you run host-side commands
(`npm run db:seed`, `psql`, `prisma studio`).

Local dev loop (host):
```bash
npm install                   # single workspace install (root lockfile)
npx prisma generate --schema prisma/schema.prisma
docker compose up -d postgres # fixed volume careerpath_pgdata — survives down/rebuilds
npx prisma migrate deploy --schema prisma/schema.prisma
psql $DATABASE_URL -f db/views.sql   # or: npm run db:views
npm run db:seed
npm run typecheck             # tsc --noEmit for api + web + scripts
npm run dev:api                # tsx watch (or: docker compose up --build)
```
API `:4000` · Web `:5173` (nginx `:80` in compose).

## Rules that matter
- Runtime reads only `approved` rows via `live_*` views — never base tables.
- Matching/roadmap is deterministic (`apps/api/src/matching/matching.ts`, typed port of the verbatim `.mjs` — logic unchanged, no DB/AI calls inside). The (disabled) LLM would only write "why this fits" text, review tasters, interview, extract poster events.
- Taster `performance` is computed **in code** from rubric weights — never trust the model's `overall_score`.
- `status: draft → ai_reviewed → approved`; poster events never auto-publish.
- All API input is Zod-validated (`validate({ body, params, query })` middleware +
  per-module `schemas.ts`): 400 `validation_error` on bad input, 409 on unique
  conflicts, 503 `ai_disabled` on AI routes.
- Prisma owns migrations. `db/schema.sql` + `db/schema_tasters.sql` are the reviewable reference (apply order: schema → tasters → `views.sql`). Structural fixes: `SCHEMA_FIXES.md`.

## Postgres volume
Named volume `careerpath_pgdata` (explicit `name:`) persists across `compose down`. Only `compose down -v` destroys it. Backup:
```bash
docker run --rm -v careerpath_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata-backup.tgz /data
```

## Demo path (§8)
Seed → onboarding/`rankFields` top-3 → taster submit/AI review/`fitScore` → field pick → `buildRoadmap` → QCM gate → AI interview → leaderboard. Run once end-to-end from a clean seeded DB before demo day; keep the Brev endpoint fallback in `.env`.
