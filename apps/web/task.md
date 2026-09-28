# Dashboard KPI phase-awareness + header nav cleanup

> Resolution: user supplied authoritative answers ("confirmed by user,
> 2026-09-27", recorded in `apps/api/product-decisions.md`), which unblocked
> Tasks 1–2. Both tasks are implemented, verified live, and closed below.

## Discovery notes (Step 0 — required before implementation)

All `.md` files under `apps/api` were listed and read. There are exactly 7,
all under `apps/api/src/llm/prompts/`:

1. `event_extraction.md` — poster→event extraction prompt. No dashboard/phase/KPI/nav rules.
2. `generate_question.md` — QCM drafting prompt. No dashboard/phase/KPI/nav rules.
3. `interview_system.md` — interviewer persona prompt. No dashboard/phase/KPI/nav rules.
4. `review_question.md` — QCM review prompt. No dashboard/phase/KPI/nav rules.
5. `review_taster.md` — taster review prompt + how-to-use-output section
   (performance computed in code, `user_known_concepts`/`point_events` writes).
   No dashboard sections, phase definitions, KPI formulas, or nav rules.
6. `roadmap_architect.md` — superseded roadmap-generation prompt. Mentions
   "progress" once ("must never block progress on an unpurchased cert" §6)
   and linear milestones. No dashboard sections, no tasting/committed phase
   definition, no KPI formulas, no nav rules.
7. `step_enricher.md` — adopted step-content prompt (concept/quiz/project/
   certification enrichment, locking semantics). No dashboard sections, phase
   definitions, KPI formulas, or nav rules.

**Finding: no document under `apps/api` defines any of the required rules.**
Specifically undocumented in `apps/api` docs:
- (a) How "tasting phase" vs "committed to a field" is represented in the
  data model (no status enum, null-field convention, or phase vocabulary
  appears in any of the 7 files).
- (b) Any progress/KPI formula (roadmap completion %, milestones-done
  counting, quiz-pass aggregation, project/cert counting, points/rank math).
- (c) Any navigation/header component, item list, or phase-dependent nav rule.

Per the task's stop-rule ("if a rule you need isn't documented there, stop
and list it as an open question rather than guessing"), **implementation of
Task 1 and Task 2 is blocked pending the open questions below.** The
acceptance criteria require KPI numbers and nav rules to be confirmed
"against the apps/api docs" — there is nothing to confirm against.

### Codebase facts (NOT docs — read from code/schema to unblock answers, do not treat as spec)
- `prisma/schema.prisma`: `UserFieldMatch.chosen: Boolean @default(false)`;
  `Roadmap { userId, fieldId }`; `UserTaster.status: in_progress|submitted|reviewed`
  (+ `performance`, `enjoyment`); `field_fit_inputs` view in `db/views.sql`
  (`tasters_done`, `avg_enjoyment`, `avg_performance` per user+field);
  `point_events` ledger + `leaderboard` view; `UserCertification`;
  `RoadmapStep.status: locked|in_progress|quiz_passed|interview_passed`.
  These are *candidate* phase/progress signals only — no doc blesses any of them.
- `apps/web/src/components/navigation/Header.tsx`: current nav arrays are
  `GUEST_LINKS`, `PERSON_LINKS` (10 items incl. Quiz, Projects, Certs, Clubs
  removed earlier), `ORG_LINKS`. Code fact, not a documented rule.
- `apps/web/src/pages/Placeholders.tsx`: still exports `Projects`, `Clubs`,
  `Resources`, `Dashboard`, `Profile` stubs; `App.tsx` routes `/projects` to
  the real Projects page and `/clubs` redirects to `/networking`.
- Contrary to the task's "existing integration decision" premise, the app
  currently HAS standalone Quiz/Certs/Projects pages and routes. No doc
  records a decision to integrate them into the roadmap view.

## Task 1 — Phase-aware dashboard KPIs on login — ✅ DONE
Citation for all formulas: "confirmed by user, 2026-09-27"
(`apps/api/product-decisions.md` Q1–Q3 + schema-adaptation appendix).
- [x] Phase representation: tasting = no `UserFieldMatch` with `chosen=true`;
  committed = exactly one (Boolean column, so "null" maps to false/absent).
- [x] `GET /api/users/me/dashboard` (`apps/api/src/modules/dashboard/routes.ts`):
  tasting → one block per tasted domain (matched ∪ taster-active fields) with
  reviewed/total tasters, avg enjoyment/performance, quizzes passed on field
  concepts; committed → exactly one block (active = latest roadmap of chosen
  field) with completion %, milestones done/total, quizzes passed, reviewed/
  total tasters, per-field certs, points + rank from `leaderboard`.
- [x] Deviation recorded: no Architect/Enricher output exists (prompts never
  ran), so KPIs compute from source tables instead of "reusing" output.
- [x] Web `Dashboard` rewritten on the endpoint (N blocks vs 1 block).
- [x] Verified live: tasting user → 3 blocks (data 1/2 reviewed, enjoy 5,
  perf 0.8); after choice+roadmap+quiz pass → committed, 1 block, 10% (1/10),
  quizzes 1, projects 1/2, points 10 rank 1, 0 taste blocks.
- [x] No new standalone quiz/project/cert pages (that direction reversed —
  existing ones removed per Q4, content stays in roadmap view).

## Task 2 — Header navigation cleanup — ✅ DONE
Citation: "confirmed by user, 2026-09-27" (`apps/api/product-decisions.md`
Q4–Q5 + nav reading).
- [x] Removed Quiz/Certs/Projects items; person nav is now Dashboard, Explore,
  Onboarding, My Fields/My Field (phase-switched via dashboard call), Roadmap,
  Networking, Ranks. Org nav untouched (Org dashboard only). No Clubs item
  anywhere (guests included); `/clubs` still redirects to `/networking`.
- [x] Deleted `pages/Quiz`, `pages/Certs`, `pages/Projects`; `/quiz`, `/certs`,
  `/projects` redirect to `/roadmap`. Footer links repointed (`/taster`,
  `/networking`).
- [x] Networking + Ranks present in both phases (reading (a) implemented).
- [x] Verified: `tsc` + `vite build` green; `/dashboard`, `/networking`, `/org`
  serve 200 from the container with the new bundle.

## Open questions — all RESOLVED ("confirmed by user, 2026-09-27")

### NEEDS CONFIRMATION → confirmed: reading (a)
Networking and Ranks always visible; Explore/Onboard/My-Fields phase-dependent
("My Fields" plural tasting → "My Field" singular committed). Implemented in
`Header.tsx` via dashboard phase call.

### Q1 → resolved
Tasting = no `chosen` match; committed = one set. Multiple simultaneous taste
domains; independent per-domain taster progress. (Adapted: Boolean column.)

### Q2 → resolved
Per-domain: completed/total taster steps + enjoyment/performance + quizzes
passed. Implemented from `user_tasters` rows + field-concept quiz passes.

### Q3 → resolved
Active roadmaps row: completion % + breakdown (courses/quizzes/projects/certs)
+ points/rank, computed from source tables (no Enricher output exists).

### Q4 → resolved
Removal authorized and executed: pages deleted, routes redirect to `/roadmap`,
footer repointed. No standalone pages remain.

### Q5 → resolved
Old standalone state confirmed stale; migrated away per Q4.

## Files changed
- `apps/api/product-decisions.md` (created) — Q1–Q5 + nav reading as spec.
- `apps/api/src/modules/dashboard/routes.ts` (created) + `app.ts` mount.
- `apps/web/src/features/dashboard/api.ts` (created) — dashboard payload client.
- `apps/web/src/pages/Dashboard/index.tsx` (rewrote) — phase branching.
- `apps/web/src/pages/Quiz|Certs|Projects` (deleted) — per Q4.
- `apps/web/src/App.tsx` — routes removed, `/quiz|/certs|/projects` → `/roadmap`.
- `apps/web/src/components/navigation/Header.tsx` — Quiz/Projects/Certs out,
  phase-switched My Fields/My Field label.
- `apps/web/src/components/navigation/Footer.tsx` — links repointed.
- `apps/web/task.md` (this file) — discovery → resolution log.

## Node-based visual roadmap UI (in progress)

### Discovery (read before coding, per brief)
- `apps/api/product-decisions.md` — no step_type column exists on
  `roadmap_steps` yet (Step 4 pending); taste/commit KPIs computed from
  `user_tasters`, `roadmap_steps.status`, `quiz_attempts`,
  `user_certifications`, `leaderboard` view.
- `apps/api/src/llm/prompts/step_enricher.md` v3 — the taxonomy source:
  step_types concept|quiz|project|certification; project locking=true,
  cert locking=false; quiz content ingestion-shaped (`status:'draft'`);
  `unsupported_step_type:<id>:<type>` flag format. Prompt is inert (AI
  disabled) — used here as the visual/semantic contract only.
- `apps/api/public/roadmap-lab.html` — NOT a data source; a test harness
  calling real endpoints (`POST /roadmaps`, quiz serve/attempt). The UI
  below consumes the new `GET /roadmaps/:id/path` endpoint instead.
- `apps/web/src/index.css` — full token set reused verbatim
  (`--brand-navy/blue/purple/cyan/teal`, `--text-primary/secondary`,
  `--surface/soft`, `--border`, `--danger`, `--warning` as cert gold,
  `--gradient-brand/progress`, `--text-*` scale). `[data-theme="dark"]`
  overrides + theme toggle already exist — no new palette introduced.
- `apps/web/src/features/theme/theme-context.tsx` — respected via CSS vars.

### Data mapping (no step_type column yet — derived 1:1 from real relations)
- COURSE node ← `roadmap_steps` row (concept + rank-1 resource). State from
  step status: locked→locked, in_progress→current, quiz_passed/
  interview_passed→completed.
- QUIZ node ← live `questions` count for the step's concept + passed state
  (step passed OR passed `quiz_attempts` row). Same gate treatment as project.
- PROJECT node ← approved `taster_projects` joined via `taster_concepts` on
  the step's concept (real relation, not invented). Completed ⇔ a `reviewed`
  `user_tasters` row; `submitted` renders as current.
- CERT node ← `certifications` (approved) whose `criteria.required_concepts`
  include the step's concept slug; earned ⇔ `user_certifications` row.
  Side-branch/badge only, never on the path, never locking.
- `skip_eligible`: no source data can produce it (known concepts are excluded
  from roadmaps at build). Style implemented (dashed outline); never emitted —
  flagged for design review, not silently dropped.

### Open design decisions (for design review, not finalized)
- Iconography: circle=course, diamond=quiz, hexagon=project, gold badge=cert.
- Unlock animation: glow-pulse on newly current nodes; drawer (not modal) so
  the path stays visible.
- Mobile: single centered column under 480px; labels below nodes.

### Files changed (this task)
- `apps/api/src/modules/roadmap/routes.ts` — added `GET /roadmaps/:id/path`.
- `apps/web/src/features/roadmap/api.ts` (created) — path payload client+types.
- `apps/web/src/pages/Roadmap/RoadmapPath.tsx` (created) — SVG skill-tree.
- `apps/web/src/pages/Roadmap/NodeDrawer.tsx` (created) — drawer + inline quiz.
- `apps/web/src/pages/Roadmap/roadmap-path.css` (created) — tokens-only styles.
- `apps/web/src/pages/Roadmap/index.tsx` (rewrote) — path view replaces list.

### Verification (live)
- Path payload for a 14-step roadmap: 14 course + 14 quiz + 10 project + 5 cert
  nodes; `currentKey` starts at `step-1-course`.
- After passing step-1 quiz: course/quiz completed, step-2 current, outstanding
  step-1 projects stay current, `currentKey` advances to first open gate.
- Quiz page deleted per Q4 — quizzing now happens inline in the path drawer.
- Real bug found while testing: `POST /field-choice` without prior compute
  updated zero match rows (choice silently uncommitted, dashboard stayed
  "tasting"). Fixed via upsert in `matching/routes.ts`.
- `tsc` (all 3) + `vite build` green; `/roadmap` serves 200 with the new bundle.

## Auth-bug + tasting-phase roadmap (new task)

### Discovery notes (Step 0)
- **Task 1 root cause (found, not guessed):** `/assessment` renders the
  `Assessment` stub in `apps/web/src/pages/Placeholders.tsx`, whose CTA is a
  hardcoded `actionLabel="Sign in to start"` → `/login`. There is no auth
  check on that route at all — signed-in users see a sign-in prompt because
  the stub always renders it. Client session (`features/auth`, user JWT in
  localStorage) and server auth (`requireAuth`) are both healthy; verified by
  the previously tested login/register flows. Fix = render the real
  onboarding question flow at `/assessment`, not an auth-check fix.
- **Onboarding entry points today:** header "Onboarding" nav item
  (`Header.tsx` PERSON_BASE_LINKS), Careers stub → `/assessment` link, plus
  FieldChoice/roadmap empty-state links to `/onboarding` and `/field-choice`.
- **Question+field-pool sourcing (confirmed single flow):** onboarding picker
  lists `background_items` with `background_item_concepts` links — the exact
  tables `matching.mjs rankFields` consumes. No duplicate flow exists;
  Architect/taster references point at the same tables.
- **FieldChoice today** (`pages/FieldChoice/index.tsx`): manual "Compute my
  top-3" button, per-field "Choose" buttons, fit section, roadmap deep-link.
  Backend `POST compute` persists top-3 to `user_field_matches`; choice marks
  `chosen` + creates roadmap shell.
- **Roadmap today** (`pages/Roadmap/index.tsx` + `RoadmapPath`/`NodeDrawer`):
  single-roadmap view driven by manual id input, no phase branching. Drawer
  quiz runner posts to real attempt endpoint; unlock refetch already works.
- **Backend gaps for Task 4:** no `GET /roadmaps` list endpoint; no per-field
  tasting-status endpoint. Both added in this pass (see Files changed).
- **Contradiction flags vs product-decisions.md (not silently resolved):**
  1. Task 2 removes the Onboarding header item — this SUPERSEDES the earlier
     nav reading that listed Onboard as a phase-dependent item. Route
     `/onboarding` stays as a legacy deep link.
  2. "Tasting complete per field" is defined here as all live tasters of the
     field reviewed (`user_tasters.status='reviewed'`) — Q1/Q2 define taster
     progress but no completion gate; this definition is new.
  3. Mini roadmaps show the first 5 positions of each field's full path —
     page size is an implementation choice, not spec'd anywhere.

### Task 1 — Fix /careers auth bug — ✅ DONE
- [x] Root-caused (see above): hardcoded stub CTA, no auth involvement.
- [x] `/assessment` now renders the real Onboarding question flow.
- [x] Signed-in user: Careers → "Take the assessment" → questions immediately.
- [x] Signed-out user: Onboarding shows a sign-in prompt (auth check kept,
      nothing removed). Tested: fetch skipped when `account===null`.
- Tested: `tsc` + `vite build` green; route renders Onboarding component.

### Task 2 — Onboarding into Explore — ✅ DONE
- [x] Header PERSON_BASE_LINKS: Onboarding item removed (no direct link).
- [x] Explore (Careers stub) keeps "Take the assessment" → `/assessment`,
      which now starts the same question flow (verified: same component,
      same `background_items` source).
- [x] Signed-in click-through lands straight in questions (no stub in path).

### Task 3 — Auto-compute top-3 on /field-choice — ✅ DONE
- [x] Compute runs on page mount; manual button removed entirely.
- [x] Per-field Choose/substitution UI removed; fit auto-loads read-only.
- [x] Single CTA "Start tasting these 3 fields →" → `/taster`. No background
      → guided empty state to `/assessment` (backend 400 mapped, tested).
- Tested: fresh user submit flow lands with top-3 visible, zero clicks.

### Task 4 — Phase-aware /roadmap — ✅ DONE
- [x] Tasting: `GET /users/me/tasting` → ensure roadmap per top-3 field →
      3 mini node-roadmaps (first 5 positions) via existing `RoadmapPath` +
      `NodeDrawer` — no duplicate component built.
- [x] All-3-complete → in-place final field-choice (3 buttons → choice
      endpoint → committed view, no redirect to /field-choice).
- [x] Committed: single full roadmap only, no taster minis.
- [x] Node design/states/gates identical to single-field view (shared code).
- Tested: live walkthrough below.

### Verification (manual walkthrough, localhost)
- [x] Fresh user (background → compute): tasting endpoint returns 3 fields,
  all roadmapId null, tasters 0/2, complete False — verified via curl.
- [x] Inserted 6 reviewed user_tasters (all live tasters, 3 fields): all 3
  flip complete True — verified via curl.
- [x] In-place choice (fieldId 4): 201 + dashboard flips to committed with
  0 taste blocks — verified via curl. Test user deleted after.
- [x] `tsc` (all 3) + `vite build` green; /roadmap /assessment /field-choice
  serve 200 from rebuilt container with new bundle strings present.

## Explore-direct-to-roadmap (follow-up)
- `/careers` is now a real browse page (was a stub → assessment): lists fields
  from `GET /fields`, "Explore path →" ensures a roadmap (latest mine, else
  `POST /roadmaps`) and navigates `/roadmap?id=`. Signed-out users route to
  `/login`. Assessment stays reachable via the "Not sure?" link (Task 2 intact).
- Files: `pages/Careers/index.tsx` (created), `App.tsx` (import swap, stub
  `Assessment` import removed).

## Dashboard tasting list + roadmap final pick (follow-up)
- Backend `GET /users/me/tasting?fields=`: explicit slug list overrides the
  default top-3 (compat 0 for unmatched, 400 on unknown slugs) — verified:
  `?fields=data` → 1 block, unknown → 400, default unchanged.
- Dashboard "Tasting list" section: every field from `GET /fields` with a
  +/✓ toggle persisted to `localStorage cp_tasting_slugs`, seeded from taste
  blocks on first load.
- Roadmap tasting minis follow the stored list (fallback: top-3; explicit
  empty list → empty state guiding to dashboard). Each mini has a
  "Pick as final path →" button; the all-complete panel stays.
- After commit, roadmap shows only that field (unchanged behavior, verified
  earlier). Bundle markers confirmed in served image.
