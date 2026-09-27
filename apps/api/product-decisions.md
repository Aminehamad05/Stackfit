# Product decisions — dashboard phases, KPIs, navigation

Authoritative product spec, **confirmed by user, 2026-09-27**. Written because
no `apps/api` doc defined these rules (see `apps/web/task.md` discovery notes).
Cite as "confirmed by user, 2026-09-27".

## Q1 — Phase representation
- Tasting phase = user has **not committed to a field yet**. Signal: no
  `UserFieldMatch` with `chosen` set for the user.
- While tasting, the user may explore **multiple candidate domains at once**;
  each candidate domain tracks its own taster progress independently (no
  shared single taster score).
- Once `chosen` is set, the user is in **committed phase for that field**.

## Q2 — Taste-phase KPI formula (per tasted domain)
- `completed taster steps / total taster steps` for that domain, where taster
  steps use the same step_type model (concept/quiz/project) as the full
  roadmap, scoped to that domain's shorter taster sequence.
- Render **one KPI block per tasted domain**.

## Q3 — Committed-phase KPI formula
- `completed milestones / total milestones` on the user's active roadmaps row,
  broken out by step_type: courses watched, quizzes passed, mandatory
  projects done, certs earned.
- Reuse existing points/completion data (Architect/Step Enricher output);
  do not write new calculation logic — surface what's tracked.

## Q4 — Dead routes + Quiz/Certs/Projects header removal
- Authorized. Standalone `/quiz`, `/certs`, `/projects` pages and header items
  are removed — content lives inside the roadmap node view instead.
- Redirect old routes to the roadmap view (no anchors exist yet, so plain
  `/roadmap`); otherwise remove outright. No standalone pages remain.

## Q5 — Codebase contradiction
- The pre-existing standalone pages were stale (predated this decision) and
  are the thing being migrated away from, not conflicting spec.

## Nav reading (confirmed)
- Networking and Ranks are **always visible**, tasting or committed.
- Explore, Onboard, and My-Fields change with phase: "My Fields" (plural,
  all tasted domains) while tasting → "My Field" (singular) once committed.

## Schema adaptation (engineering — how the above maps onto the real schema)
- Q1 says "`chosen` is null"; the column is `Boolean @default(false)`, so
  **tasting = no match row with `chosen = true`**; committed = exactly one.
- No `step_type` column exists on `roadmap_steps` yet (Step 4 pending) and no
  per-domain "taster sequence" table exists. Until Step 4: taste blocks are
  computed from `user_tasters` (+ `field_fit_inputs`) per field, and committed
  milestones from `roadmap_steps.status`, `quiz_attempts`, `user_tasters`,
  `user_certifications`, and the `leaderboard` view.
- No Architect/Enricher output data exists anywhere (those prompts never ran);
  Q3's "reuse, don't calculate" is therefore implemented as computation from
  the source tables the Enricher would have written. Revisit once Step 4 lands.
