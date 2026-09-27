# Stackfit — CareerPath

> Pick a tech field. Prove you understand it. Get certified.

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.18-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

Stackfit helps CS students and career switchers **stop browsing courses and start proving skills**: declare your background → get your top-3 fields with compatibility scores → taste each field hands-on → follow a prerequisite-ordered roadmap with quiz gates → earn certifications, ship projects, and climb the leaderboard. University clubs post hackathons and meetups through their own portal.

---

## ✨ Features

### For students
| Area | What you get |
|---|---|
| **Onboarding** | Pick uni courses, skills & experience; rate confidence/interest; see inferred known/liked knowledge maps |
| **Field matching** | Deterministic top-3 ranking with compatibility % (skill + interest weighted), fit scores after tasters |
| **Tasting phase** | Per-field tasting bundles: 5 simplest concepts with resources, guided 1h tastings, starter projects ordered by simplicity — with a personal tasting list (add/remove fields, one-click apply) |
| **Roadmap** | Prerequisite-ordered steps (Kahn's algorithm) rendered as a Duolingo-style skill tree: course nodes, quiz/project gates (⬡/◆ shapes), gold certification side-badges, drawer details, unlock animations, keyboard navigation |
| **Quiz gates** | 280 seeded QCMs (5/concept); pass ≥ 70% to unlock the next step; answers never leak to the client |
| **Certifications** | Auto-awarded when required courses + taster are done, with progress tracking and evidence snapshots |
| **Projects** | Readiness-ranked suggestions (ready first) tied to mastered concepts |
| **Dashboard** | Phase-aware KPIs — one block per tasted domain while tasting, single committed-field block (completion %, quizzes, projects, certs, points, rank) after choosing |
| **Networking** | Browse approved events (filter by field/city/date), one-tap subscribe, `.ics` download, Google Calendar links |
| **Study assistant** | Floating AI chat (Gemini free tier) that knows your field, roadmap progress and known concepts |
| **Leaderboard** | Points ledger (quiz/taster/project) with live ranking |

### For clubs (organisations)
Separate auth world (`type:'club'` JWTs) with its own dashboard: club login/registration, event CRUD with draft → publish workflow, ownership enforcement (a club can never touch another club's events). Student routes return `403` for club tokens and vice versa.

### Platform guarantees
- **Deterministic core** — matching, roadmaps, grading, awards are pure code over the DB graph. No LLM in the request path; the AI layer is a disabled, clearly-bounded stub (`503 ai_disabled`) ready for future re-enablement.
- **Curated content only** — the app reads exclusively through `live_*` views (`status = 'approved'`); drafts never leak.
- **Validated everything** — Zod on every input (`400`), unique conflicts (`409`), cross-role access (`403`).

---

## 🧰 Tech stack

| Layer | Tech |
|---|---|
| Language | TypeScript 5.9 (strict) throughout |
| API | Node.js 20 + Express 4, Zod 3 validation, JWT (dual user/club worlds) |
| Web | React 18 + React Router 6 + Vite 5, vanilla CSS design tokens, dark mode |
| Database | PostgreSQL 16 + pgvector, Prisma 5 ORM + migrations |
| Dev runtime | tsx (watch + scripts) |
| Infra | Docker Compose: `postgres` (fixed named volume) · `api` (migrate → bootstrap → serve) · `web` (nginx SPA + `/api` proxy) · `worker` (on-demand scripts) |

### Architecture

```
┌──────────┐     ┌────────────────────────────────────────────┐
│  React   │────▶│  Express API  (Zod → guard → Prisma → Pg)   │
│  (nginx) │◀────│  matching.ts · progress.ts (pure logic)    │
└──────────┘     └────────────────────────────────────────────┘
       ▲                         │  reads live_* views only
       │ same-origin /api        ▼
谁也不欠谁                  ┌────────────┐
                         │ Postgres 16│  30 models · 9 views
                         │ + pgvector │  fixed volume pgdata
                         └────────────┘
```

---

## 🚀 Quickstart

**Teammates — one command, no setup:**
```bash
git clone <repo> && cd Stackfit
docker compose up --build
```
- App → http://localhost:5173 · API → http://localhost:4000/api · API test console → http://localhost:4000/console/test-console.html · Roadmap lab → http://localhost:4000/console/roadmap-lab.html
- First boot auto-migrates, creates views, and seeds all content (only if empty). No `.env` needed (sane defaults).

**Local dev (hot reload):**
```bash
npm install
docker compose up -d postgres
npx prisma migrate deploy --schema prisma/schema.prisma
npx tsx scripts/bootstrap.ts      # views + seed-if-empty
npm run dev:api                   # :4000 (tsx watch)
npm run dev:web                   # :5173 (proxies /api → :4000)
```

**Demo accounts** — students: register in-app · clubs: `info@<club>.com` / `club2000` (e.g. `info@ieeeinsatstudentbranch.com`)

### Environment

| Var | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Prisma connection | `postgresql://careerpath:careerpath@localhost:5433/careerpath` |
| `JWT_SECRET` | Sign user + club tokens | `dev-secret` (set a real one in prod!) |
| `CLUB_SEED_PASSWORD` | Password for seeded clubs | `club2000` |
| `VITE_API_URL` | Web → API base (`/api` = same-origin via nginx) | `/api` |
| `AI_ENABLED` | AI layer flag (disabled — no provider wired) | `false` |

---

## 📚 API reference

Base `/api`. Auth: `Authorization: Bearer <jwt>` (`requireAuth` = students, `requireClub` = organisations; cross-use → `403`).

| Method & path | Auth | Description |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | – | Student JWT auth (bcrypt) |
| `POST /clubs/register`, `POST /clubs/login` | – | Organisation JWT auth |
| `GET /background-items[?kind=]` | – | Catalogue with linked concepts |
| `POST /users/me/background` · `GET /users/me/background` · `GET …/background/profile` | user | Save (replace-all) / read back / known+liked inference |
| `POST /users/me/field-matches/compute` · `GET …` | user | Deterministic top-3 + compatibility % |
| `GET /users/me/field-fit` · `POST /users/me/field-choice` | user | Post-taster fit · commit field (creates roadmap shell) |
| `GET /fields/:id/tasting` · `GET /fields/:id/taster` | user | 5 simplest concepts + starter projects · primary taster |
| `POST /users/me/tasters/:id/start` · `…/submit` | user | Taster lifecycle (review AI-gated) |
| `POST /roadmaps` · `GET /roadmaps` · `GET /roadmaps/:id` · `GET …/path` | user | Generate (known-overlay + Kahn sort + resources) · list · read · skill-tree nodes |
| `GET /concepts/:id/quiz` · `POST …/quiz/attempt` | user | Live QCMs (no answers leaked) · grade ≥ 0.7 → unlock + points + cert check |
| `POST /interviews*` | user | ⛔ AI-disabled (`503`) |
| `POST /chat/threads` · `GET …` · `GET …/:id/messages` · `POST …/:id/messages` · `DELETE …/:id` | user | AI study chat (threads persist; needs `LLM_API_KEY`, else guided `503`) |
| `GET /users/me/certifications` · `POST …/check` | user | Progress + auto-award with evidence |
| `GET /users/me/project-suggestions` | user | Readiness-ranked builds |
| `GET /users/me/dashboard` | user | Phase-aware KPIs (N taste blocks / 1 committed block) |
| `GET /users/me/tasting[?fields=]` | user | Per-field taster progress + complete gate |
| `POST /clubs/me/events` · `GET …` · `PATCH/DELETE …/:id` | club | Event CRUD, ownership-enforced, draft→approved |
| `GET /fields` · `GET /events[?field=&city=&from=]` · `GET /events/:id/ics` · `GET …/gcal-link` | – | Public catalogue, filtered events, calendar export |
| `POST /events/:id/subscribe` · `DELETE …` · `GET /users/me/events` | user | Approved-only subscriptions |
| `GET /leaderboard` | user | Ranked points ledger |
| `GET /health` | – | Liveness |

---

## 🗄️ Data

Seeded via `npm run db:seed` (idempotent upserts) or automatically on first container boot:

4 fields · 56 concepts (81 prerequisite edges) · **280 QCMs + 1120 options (5/concept)** · 36 resources (123 links) · 8 tasters · 8 project suggestions · 4 certifications · 8 clubs · 16 events — plus `live_*` views, `field_fit_inputs`, and `leaderboard`.

Key invariants: exactly one correct option per question (partial unique index) · append-only `point_events` with deterministic `ref_id` dedupe · taster `performance` computed in code, never from model output.

---

## 🛠️ Scripts & consoles

| Command | What |
|---|---|
| `npm run typecheck` | `tsc --noEmit` across api + web + scripts (must stay green) |
| `npm run db:seed` / `db:views` / `db:migrate*` | Seed · apply views · Prisma migrations |
| `npm run check-links` | Real HEAD-check of every resource URL, stamps `verified_at` |
| `npm run generate-questions` / `review-content` | AI-gated stubs (SKIP while disabled) |
| `/console/test-console.html` | No-build vanilla QA page for every working endpoint |
| `/console/roadmap-lab.html` | Plain-text roadmap generator + step-by-step quiz walkthrough |

---

## 📁 Project structure

```
apps/api/src/{modules/{auth,background,matching,tasters,roadmap,quiz,interview,points,events,clubs,growth,fields,dashboard},matching/matching.ts,progress/,middleware/,schemas/,ai/ (disabled boundary),llm/prompts/*.md}
apps/web/src/{pages/{Auth,Landing,Onboarding,FieldChoice,Careers,Taster,Roadmap,Dashboard,Networking,Events,Org,Leaderboard,Interview},features/{auth,dashboard,roadmap},components/{ui,navigation},lib/}
prisma/{schema.prisma,migrations/}   db/{schema.sql,schema_tasters.sql,views.sql,seed/*.json}
scripts/{bootstrap.ts,check-links.ts,…}   docker-compose.yml
AGENT_SPEC.md = product spec · AGENT.md = engineering contract · SCHEMA_FIXES.md = DB decisions
```

---

## 🗺️ Roadmap (project status)

**Done:** auth (both worlds) · background + inference · matching + fit · tastings · roadmap generation + skill-tree UI · quiz gates + unlocks · certifications + projects · dashboard KPIs + tasting list · club portal + subscriptions · events browsing + calendar export.
**Stubbed:** taster start/submit persistence paths, leaderboard reads.
**AI-gated:** interviews, taster auto-review, question gen/review, poster extraction.
**Next candidates:** Step 4 (`roadmap_steps.step_type` + paid-cert resources) · org signup verification · GitHub-activity points.

---

## 🤝 Contributing

1. Read `AGENT_SPEC(1).md`, `AGENT.md`, and `apps/api/product-decisions.md` before touching code.
2. Keep `npm run typecheck` green; add Zod schemas + the right auth guard on every route; read via `live_*` views.
3. Never commit `.env`; seed data lives in `db/seed/*.json`; migrations are hand-reviewed.
4. Test with the consoles (`/console/*`) or the checklist in `apps/web/task.md`.

## 📄 License

MIT — see [LICENSE](./LICENSE).
