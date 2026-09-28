# Stackfit — Website Description (source of truth for design & finish)

> Purpose: one document that describes the website exactly — identity, theme,
> layout, every page, every state — so anyone (or any agent) can reproduce it
> and judge whether it is "perfect". Facts below match the code in `apps/web`.

## 1. Identity

- **Name:** Stackfit — wordmark renders `Stack` in navy + `fit` in brand blue.
- **Tagline:** "Find your path. Build what's next."
- **Audience line:** "Built for Tunisian CS students, engineers, and career switchers."
- **Footer sign-off:** "© 2026 Stackfit. Learn by building."
- **Logo:** `/logo.png` (stacked isometric layers: violet top with white
  up-arrow, blue middle, teal-green base; favicon + header 36px + footer 32px
  + landing hero visual). `logo.svg` is fallback only.
- **Voice:** direct, encouraging, concrete. Numbers everywhere ("0.6 skill +
  0.4 interest", "best = 100%"). Never vague ("explore opportunities").

## 2. Theme system (`src/index.css`, tokens in `:root`)

Light is default; night mode = `data-theme="dark"` on `<html>`, toggled from
the header, persisted in `localStorage['stackfit_theme']`, falls back to
`prefers-color-scheme`. Surfaces transition in 150ms.

| Token | Light | Dark |
|---|---|---|
| `--brand-navy` (headings) | `#0b1633` | same |
| `--brand-blue` (primary) | `#3255fd` (hover `#2543d6`) | same |
| `--brand-purple` (accent) | `#8241fb` | same |
| `--brand-cyan` | `#2fa9f4` | same |
| `--brand-teal` | `#01c8b1` | same |
| `--text-primary` | `#0b1633` | `#e9edf7` |
| `--text-secondary` | `#596273` | `#a4aec6` |
| `--surface` | `#ffffff` | `#0d1526` |
| `--surface-soft` | `#f6f8fc` | `#14203a` |
| `--border` | `#e4e8f0` | `#263357` |
| soft tints (blue/purple/teal/danger) | `#edf1ff` `#f3ecff` `#e3faf6` `#fdeef0` | `#1b2653` `#261b52` `#0c3a35` `#3d1a23` |
| shadows | `0 8px 30px rgba(16,26,56,.08)` | black `.35` / hover `.45` |

- **Signature gradients:** brand `135deg #8241fb → #3255fd → #01c8b1`
  (mirrors the logo); progress bars `90deg` same stops.
- **Type:** Inter/system stack; scale xs `.75` / sm `.875` / md `1` /
  lg `1.125` / xl `1.5` / 2xl `2` / 3xl `2.75` rem; headings navy,
  `line-height 1.15`, `letter-spacing -0.01em`; body `1.6`.
- **Radii:** controls 8 · inputs 10 · cards 16 · panels 20 · hero 24.
- **Buttons** (44px min-height, 600 weight, 150ms transitions):
  primary blue · secondary bordered · accent purple · teal · ghost ·
  `btn-sm` 36px · `btn-block` full width; disabled = 60% opacity.
- **Badges:** pill, tones blue/purple/teal/gray/danger.
- **Cards:** 16px radius, 24px padding, soft shadow, hover-lift variant.
- **States kit:** `LoadingSkeleton`, `EmptyState` (title+body+action),
  `ErrorState` (role=alert + retry), `ProgressBar` (0–100 + label).
- **A11y:** visible `:focus-visible` cyan ring, `aria-label/busy` on async
  regions, `prefers-reduced-motion` disables transitions.

## 3. Layout chrome

- **Container:** `min(1120px, 100%−32px)` centered; every page opens with
  `.page-head` (one `h1` + one explanatory `p`).
- **Header (sticky, 68px, blurred):** logo left → scrollable pill nav
  (never wraps, never crushes actions) → actions right (theme sun/moon,
  account chip, Sign in / Get started or Sign out, hamburger on mobile).
  Account chip shows the user's **display name** (truncated, icon-only on
  small screens), full email on hover.
- **Nav is role-aware:** guests see Explore/Networking/Data & Trust;
  students see Explore/Onboard/My Fields (+Networking/Ranks only during the
  **taste phase**: matches computed, none chosen yet); orgs see only
  Org dashboard. `/org` is guard-redirected to login for non-orgs.
- **Footer (4 columns):** brand+tagline+audience | Learn (Career paths,
  Skill assessment, My roadmap, Taster projects) | Community (Student clubs→
  networking, Events, Leaderboard) | Account (Sign in, Create account,
  Dashboard); bottom bar with sign-off + "Student progress · Club events ·
  Practical roadmaps".

## 4. Pages & the journey

1. **`/` Landing** — hero (purple badge, giant two-line tagline, sub,
   `Find my path` + `Explore careers`, proof row assessment/tasters/events),
   logo visual + "next step" assessment card; then "Four paths. One guided
   journey." cards (Full-Stack 🧱 blue · Cloud ☁️ cyan · ML 🧠 purple ·
   Data 📊 teal, each with concept/project counts + level badge).
2. **`/login` · `/register`** — split auth panel with logo side; person vs
   organisation selector; register has **password + retype-confirmation**
   with mismatch error; org notes seeded `club2000` shortcut. Two JWT worlds
   (person vs club; cross-use = 403).
3. **`/dashboard`** — time-aware greeting **by display name**
   ("Good evening, Yassine"); server-driven phase (`tasting` = one KPI block
   per tasted domain with tasters/quizzes/enjoyment/performance, `committed` =
   exactly one block with roadmap progress, points, rank, certs). Tasting-list
   editor (pick fields → apply). No invented numbers — gaps are stated.
4. **`/onboarding`** — background picker (uni courses/skills grouped,
   confidence + interest as segmented 1–5 buttons, blue/teal) → save →
   known/liked concept inference.
5. **`/field-choice`** — "Compute my top-3" → compatibility % cards
   (best = 100%, skill/interest split, matched concepts) → Choose writes the
   roadmap shell + marks chosen; fit-after-tasters section (`null` = not
   tried yet, never ranked).
6. **`/taster`** — "Taste this field" bundle: 5 simplest concepts + top
   resource each, starter projects simplest-first with readiness bars,
   guided tastings with rubrics; start/submit persists (AI review 503 while
   disabled — stated in UI, not hidden).
7. **`/roadmap`** — visual tasting paths (one per field, no branches):
   course nodes open resources, quiz gates run inline in the node drawer
   (all-answers-required submit, pass ≥ 70% unlocks, awards surfaced),
   project gates link to tasters, certs are optional extras. Committing to a
   field builds the full path; private ids read as not-found (no leakage).
   (`/quiz`, `/certs`, `/projects` redirect here — no standalone pages.)
8. **`/certs` · `/projects` (via dashboard)** — earned vs in-progress certs
   with missing concepts; ready-first project suggestions.
9. **`/networking` + `/events`** — public approved events with field/city/
   from filters, subscribe/unsubscribe, `.ics` download + Google Calendar
   link; "my events" for students.
10. **`/org`** — club-only event CRUD (draft→publish), zero student features.
11. **`/leaderboard`** — podium top-3 + ranked rows with points bars and a
    "you" highlight; sign-in prompt for guests.
12. **`/interview`** — disabled-state page explaining the 503 AI layer.
13. **Chat widget** (all pages, bottom-right) — threads persist server-side;
    sending needs `LLM_API_KEY` (first live AI feature), otherwise a guided
    503. History capped at 20 messages.
13. **`/data-trust`** — Data Source / Volume (real seed counts) / Access
    (least-privilege + 403 split) / Permissions (consent, link-don't-host,
    no sensitive data).
14. Placeholders (`/careers`, `/assessment`, …) are explicit
    stubs with onward links — never dead ends.

## 5. Data & API contract (what the UI may assume)

- Same-origin `/api` (vite proxy locally, nginx in compose); user token
  wins, club token for org routes; `ApiError` carries `{status, code}` and
  every page maps 400/401/403/404/409/501/503 to human copy.
- Live reads come from approved-only views; seed: 4 fields, 56 concepts,
  280 QCMs, 36 resources, 8 tasters, 8 clubs, 16 events.
- Matching/roadmap math is deterministic (`0.6/0.4`, fit `0.2/0.5/0.3`);
  the LLM only ever writes explanations/reviews — the UI never presents
  AI-blocked features as working.

## 6. "Perfect" checklist

- [ ] Every route renders in light + dark with zero unreadable text.
- [ ] Header never overflows at 360px–1440px (scroll nav, icon-only chip).
- [ ] Each page: loading → content/empty → error-retry states all reachable.
- [ ] Greeting + chip always show display name, never the email prefix.
- [ ] No stub pretends to work; every 501/503 names the unblocking step.
- [ ] `npm run typecheck` + `vite build` green; no console errors on the
      happy path (register → onboarding → compute → taste → choose →
      roadmap → subscribe).
