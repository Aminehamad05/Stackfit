# CareerPath — hackathon MVP

An app for CS students and career switchers: pick a tech field, prove you
understand it through tasters → roadmap → quizzes, climb the leaderboard,
join club events. Spec: `AGENT_SPEC(1).md`. Agent playbook: `AGENT.md`.

## Stack
TypeScript (strict) · Node 20 + Express (`apps/api`) · React + Vite (`apps/web`) ·
Postgres 16 + pgvector · Prisma migrations · Zod validation · Docker Compose
(`postgres`, `api`, `worker`, `web`).

> **AI layer: DISABLED.** No LLM dependency, no LLM imports. AI routes return
> `503 ai_disabled`; AI scripts exit with SKIP. Re-enable via `apps/api/src/ai/`
> + `AI_ENABLED=true` (see `AGENT.md`).

## Quickstart (teammates: one command)
```bash
git clone <repo> && cd <repo>
docker compose up --build
```
No `.env` needed — defaults kick in. First boot: `postgres` starts → `api`
runs `migrate deploy` → `bootstrap` creates the 7 views and seeds all content
(only if empty) → serves. Web: http://localhost:5173 · API:
http://localhost:4000/api · Manual QA console:
http://localhost:4000/console/test-console.html (no-build vanilla page for
every working endpoint). Copy `.env.example` → `.env` only for host-side
commands (`npm run db:seed`, `psql`, `prisma studio`).

Local dev loop:
```bash
npm install                                    # single root lockfile, all workspaces
npx prisma generate --schema prisma/schema.prisma
docker compose up -d postgres
npx prisma migrate deploy --schema prisma/schema.prisma
npx tsx scripts/bootstrap.ts                   # views + seed-if-empty
npm run typecheck                              # api + web + scripts, must be green
npm run dev:api                                # tsx watch on :4000
```

## Auth: two worlds
- **Users** (students): `POST /api/auth/register` + `/login` → JWT `{sub, email}`.
  Guard protected routes with `requireAuth` (`req.user`).
- **Clubs** (organisations): `POST /api/clubs/login` → JWT `{type:'club', clubId}`.
  Guard with `requireClub` (`req.club`) — it rejects user tokens too. Seeded
  clubs all use password **`club2000`**:

| Club | Email |
|---|---|
| IEEE INSAT | info@ieeeinsatstudentbranch.com |
| IEEE SUP'COM | info@ieeesupcomstudentbranch.com |
| IEEE ESSTHS | info@ieeeessthsstudentbranch.com |
| IEEE ISIMM | info@ieeeisimmstudentbranch.com |
| IEEE ENIS | info@ieeeenisstudentbranch.com |
| IEEE FST | info@ieeefststudentbranch.com |
| IEEE CS ISIMA | info@ieeecsisimastudentbranchchapter.com |
| IEEE CS EPS | info@ieeecsepsstudentbranchchapter.com |

## Endpoint status
✅ **Working:** `/health`, user register/login, club login, club event CRUD
(`GET/POST /clubs/me/events`, `PATCH/DELETE /clubs/me/events/:id` —
ownership-enforced, draft→approved publish), user subscribe/unsubscribe
(`POST/DELETE /events/:id/subscribe`, `GET /users/me/events` — approved-only),
certifications (`GET /users/me/certifications`, `POST …/check` auto-award) +
project suggestions (`GET /users/me/project-suggestions`, ready-first).
❌ **Stubs (501, Zod schemas ready):** background, field-matches, tasters,
roadmap, quiz, leaderboard, public events reads, `.ics`/GCal links.
⛔ **AI-blocked (503):** `POST /interviews*`, taster auto-review.

## Data (seeded)
4 fields · 56 concepts (81 prereq edges) · **280 QCMs + 1120 options (5/concept)**
· 36 resources · 4 tasters · 8 clubs · 16 events — all `approved`, all served
via `live_*` views. Reseed: `npm run db:seed` (idempotent upserts). Clean slate:
`docker compose down -v && docker compose up --build`.

## Rules that matter
- Reads go through `live_*` views (approved only) — never base tables.
- Matching/roadmap is deterministic (`matching.ts`, no DB/AI calls); the LLM
  would only write explanations, review tasters, interview, extract posters.
- Taster `performance` is computed **in code** from rubric weights.
- All input is Zod-validated: 400 `validation_error`, 409 conflicts, 503 on AI routes.
- Prisma owns migrations; `db/*.sql` is the reviewable reference (`SCHEMA_FIXES.md`).

## Postgres volume
Fixed named volume `careerpath_pgdata` survives `compose down`. Only
`down -v` destroys it. Backup:
```bash
docker run --rm -v careerpath_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata-backup.tgz /data
```
