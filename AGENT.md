# AGENT.md — contributor playbook for CareerPath

Read `AGENT_SPEC(1).md` (product spec) and `README.md` (setup) first. This file
is the engineering contract: how to build without breaking the project.

## 1. Commands (repo root)
| Task | Command |
|---|---|
| Typecheck everything (must be green) | `npm run typecheck` (api + web + scripts) |
| API dev server | `npm run dev:api` (tsx watch, :4000) |
| DB up / migrate / views+seed | `docker compose up -d postgres` → `npx prisma migrate deploy --schema prisma/schema.prisma` → `npx tsx scripts/bootstrap.ts` |
| Reseed (idempotent) | `npm run db:seed` |
| Prisma client regen (after schema edit) | `npx prisma generate --schema prisma/schema.prisma` |
| Full-stack containers | `docker compose up --build` |
| Clean slate | `docker compose down -v && docker compose up --build` |

## 2. Architecture rules (non-negotiable)
1. **Reads go through `live_*` views** (`live_questions`, `live_concepts`,
   `live_resources`, `live_tasters`, `live_events`) — never base content tables
   from user-facing code. Prisma can't own views: they live in `db/views.sql`
   and are applied by `scripts/bootstrap.ts` on every container boot.
2. **`matching.ts` is pure**: no DB, no AI, no side effects. API layers load
   rows → call it → persist. Port logic changes 1:1 with the original `.mjs`.
3. **AI boundary**: nothing outside `apps/api/src/ai/` may import an LLM SDK
   (there is none installed — keep it that way). AI-backed code paths call
   `getAi(feature)` and let `AiDisabledError` bubble to the global handler
   (503). Re-enable = implement `AiProvider` + `AI_ENABLED=true`, nothing else.
4. **Zod everywhere**: every route declares `validate({ body?, params?, query? })`
   with schemas in the module's `schemas.ts` (+ shared `schemas/common.ts`).
   Handlers re-`parse(req.body)` to get typed data. Never trust raw input.
5. **Two auth worlds**: `requireAuth` → `req.user.sub` (students),
   `requireClub` → `req.club.clubId` (organisations, rejects user tokens).
   Every `/users/me/*` route needs `requireAuth`; every `/clubs/me/*` needs
   `requireClub`. Cross-ownership access returns **404, not 403** (no leakage).
6. **Deterministic ids for dedupe**: `point_events.ref_id` (e.g. `quiz:<id>`)
   and subscription upserts must be idempotent — Postgres NULLs don't collide.
7. **Taster `performance`** is computed in code from rubric weights
   (weights sum to 100 in seed data — normalize). Never trust model scores.

## 3. Adding a feature (checklist)
- [ ] Add/extend Zod schemas in the module's `schemas.ts`.
- [ ] Wire route with `validate()` + the right auth guard (`requireAuth` /
      `requireClub`); mount order in `app.ts` matters (see §5).
- [ ] Read via `live_*` views (or `$queryRaw` for view aggregations).
- [ ] Map errors: Zod→400 (automatic), conflicts→409 (automatic via P2002),
      missing/foreign→404, AI→503 via `getAi()`.
- [ ] `npm run typecheck` green + live-probe with curl (200/201 happy path,
      400 bad body, 401 bad/no token, 404 foreign id). Faster: click through
      `/console/test-console.html` (`apps/api/public/`, served by Express).

## 4. Database workflow
- **Source of truth**: `prisma/schema.prisma`. Migration SQL is generated, then
  hand-augmented when needed (pgvector extension, partial indexes, backfills).
- `prisma migrate dev` is **interactive and refuses to run headless** — in this
  environment create `prisma/migrations/NNNN_name/migration.sql` manually
  (or via `migrate diff --from-empty/--from-migrations ... --script`) and apply
  with `migrate deploy`. If a migration fails halfway: `migrate resolve
  --rolled-back <name>`, fix, redeploy.
- **Backfills belong inside the migration** (see `0001_club_auth`: columns →
  `UPDATE`s → guard `DO` block that raises on missed rows → `SET NOT NULL`).
- **Seed loader** (`db/seed/index.ts`): upserts by slug/unique, FK order
  (fields → concepts → edges → items → resources → tasters → clubs → events →
  questions+options), rejects QCMs violating 4-options/1-correct. `bootstrap.ts`
  runs it only when `fields` is empty. Seed JSON keys must match DB columns;
  slug/name references are resolved to ids in code. Question bank merges
  `questions.json` + `question2.json`, deduped by concept+stem.

## 5. Pitfalls already paid for (don't re-learn them)
- **Router mount order**: `/clubs/me/events` vs `/clubs/:id/events` — mount the
  more specific router (`clubs`) **before** `events` in `app.ts`, or `"me"`
  parses as `NaN` id. Comment in code explains it.
- **Nested `@prisma/client`**: never `npm install --prefix apps/*` (creates a
  shadowing stub copy). Single root lockfile, exact-pinned `5.18.0`, one
  deduped copy. If `did not initialize yet` appears, check for nesting first.
- **`import.meta` breaks `tsc` for scripts** (root has no `"type"` field):
  resolve seed paths from `process.cwd()`, not `import.meta.url`.
- **Alpine + Prisma**: `apps/api/Dockerfile` must `apk add openssl`.
- **Web Docker builds from the root lockfile** (`--include-workspace-root`);
  nginx needs the SPA fallback (`nginx.conf`) or deep links 404.
- **bootstrap's view splitter** must strip `--` comment lines *before*
  splitting on `;`, or statements following comments get skipped.
- Host port is **5433** (local Postgres 16 owns 5432); inter-service stays
  `postgres:5432`. `.env` is optional for compose (defaults + `required: false`).

## 6. Status & build order
- ✅ Working: health, user+club auth, background catalogue (concept details) +
  save/read-back + `…/background/profile` (known/liked inference),
  field matching (compute/list/fit/choice with compatibility %),
  club event CRUD, user subscriptions,
  certifications (progress + check/award) + project suggestions, validation/errors,
  seed (4 fields / 56 concepts / 280 QCMs / 36 resources /
  4 tasters / 8 clubs / 16 events / 4 certifications / 8 project suggestions).
- ✅ Web (`apps/web`): Landing + person/org auth, Dashboard (greeting, progress,
  next action, points — ≤4 blocks), Onboarding picker, FieldChoice %,
  Taster flow, Roadmap, Quiz runner, Certs, Projects, Events + club portal,
  Leaderboard, Interview (disabled state). Same-origin `/api` via nginx.
  NOTE: nav is still shared — org/student split + 403 guards land in Step 3.
- ✅ Onboarding has zero pro-experience fields; deferred free-text AI step is a
  documented backlog item (`ONBOARDING_STEPS` in Onboarding page,
  `KnownSource.experience_ai` reserved in DB via 0003 migration).
- ✅ Roadmap generation (`POST /roadmaps` → known overlay → buildRoadmap →
  rank-1 resources w/ free default → `GET /roadmaps/:id` owner-only) +
  `roadmap-lab.html` plain-text test page.
- Next (no AI needed): background → field-matches compute → taster
  persist-only → roadmap → quiz → leaderboard → public events reads.
- Blocked on AI: interviews, taster auto-review, question gen/review, poster
  extraction, "why this fits" text. Hook points are marked; don't build around
  them.
