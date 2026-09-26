# Stackfit Frontend Design Skill

## Purpose

Use this skill whenever designing or implementing the Stackfit frontend.

**Product:** Stackfit\
**Tagline:** Find your path. Build what's next.\
**Audience:** Tunisian CS students, engineering students, and career
switchers.\
**Core experience:** Help users discover a suitable tech career path,
assess their current skills, and follow a practical learning roadmap.

The visual identity should feel **modern, technical, optimistic,
structured, and approachable** --- not like a generic coding bootcamp.

------------------------------------------------------------------------

## 1. Brand Identity

### Brand idea

Stackfit combines:

-   **Stack** → technology stacks, skills, learning layers
-   **Fit** → matching a learner with the right career path

The logo's layered upward shape represents **building skills
progressively and moving forward**.

### Design personality

Use:

-   Clean
-   Modern
-   Technical
-   Confident
-   Friendly
-   Structured
-   Progress-oriented
-   Student-friendly

Avoid:

-   Overly corporate enterprise styling
-   Excessive gradients
-   Neon cyberpunk aesthetics
-   Heavy glassmorphism
-   Generic developer clichés
-   Dense dashboards with no hierarchy

------------------------------------------------------------------------

# 2. Color System

The logo uses a dark navy foundation with a blue/purple/teal
progression.

Use these as the Stackfit brand palette:

  Token            Hex         Primary use
  ---------------- ----------- ---------------------------------------
  `brand-navy`     `#0B1633`   Main text, headings, dark UI
  `brand-blue`     `#3255FD`   Primary actions, links, active states
  `brand-purple`   `#8241FB`   Secondary brand accent
  `brand-cyan`     `#2FA9F4`   Supporting accent, information
  `brand-teal`     `#01C8B1`   Progress, success, completion
  `brand-gray`     `#596273`   Secondary text
  `surface`        `#FFFFFF`   Main page background
  `surface-soft`   `#F6F8FC`   Cards, sections, subtle backgrounds
  `border`         `#E4E8F0`   Borders and dividers
  `danger`         `#DC4C64`   Errors/destructive actions
  `warning`        `#D99A24`   Warnings

### CSS variables

``` css
:root {
  --brand-navy: #0B1633;
  --brand-blue: #3255FD;
  --brand-purple: #8241FB;
  --brand-cyan: #2FA9F4;
  --brand-teal: #01C8B1;

  --text-primary: #0B1633;
  --text-secondary: #596273;
  --surface: #FFFFFF;
  --surface-soft: #F6F8FC;
  --border: #E4E8F0;

  --danger: #DC4C64;
  --warning: #D99A24;

  --gradient-brand: linear-gradient(
    135deg,
    #8241FB 0%,
    #3255FD 48%,
    #01C8B1 100%
  );
}
```

### Color rules

**Primary actions:** blue.

**Secondary brand accents:** purple.

**Progress / completed states:** teal.

**Information:** cyan.

**Headings:** navy.

**Body text:** gray.

Do not use all brand colors in every component. Most screens should use
navy + blue with small amounts of purple/teal.

------------------------------------------------------------------------

# 3. Typography

Use a modern sans-serif typeface.

Preferred stack:

``` css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### Type scale

``` css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-md: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.5rem;
--text-2xl: 2rem;
--text-3xl: 2.75rem;
--text-4xl: 3.5rem;
```

### Typography rules

-   Headings: bold, navy.
-   Hero headings: large and confident.
-   Body text: comfortable line-height around `1.5–1.7`.
-   Labels: medium weight.
-   Avoid excessive uppercase text.
-   Never use decorative fonts.

------------------------------------------------------------------------

# 4. Logo Usage

The Stackfit logo should remain visually dominant and uncluttered.

### Header

Use:

``` text
[Stackfit logo]        Explore   Roadmap   Projects   Sign in
```

Recommended logo height:

-   Desktop: `32–40px`
-   Mobile: `28–32px`

### Do not

-   Recolor the logo arbitrarily.
-   Add shadows around the logo.
-   Put it on a visually noisy background.
-   Stretch or distort it.
-   Add another gradient behind it.

For dark backgrounds, use a white/light logo treatment if an approved
variant exists.

------------------------------------------------------------------------

# 5. Layout System

Stackfit should feel spacious.

### Recommended container

``` css
.container {
  width: min(1120px, calc(100% - 32px));
  margin-inline: auto;
}
```

Large desktop layouts can use up to approximately `1200px`.

### Spacing scale

Use an 8px-based system:

``` text
4px
8px
12px
16px
24px
32px
48px
64px
80px
96px
```

Use larger spacing between sections than between components.

------------------------------------------------------------------------

# 6. Border Radius

Stackfit should have soft, modern corners.

``` text
Small controls: 8px
Inputs: 10px
Cards: 16px
Large panels: 20px
Hero containers: 24px
Pills: 999px
```

Avoid excessive rounded shapes. The interface should still feel
technical and structured.

------------------------------------------------------------------------

# 7. Shadows

Use subtle shadows only.

Preferred:

``` css
box-shadow:
  0 8px 30px rgba(16, 26, 56, 0.08);
```

Hover:

``` css
box-shadow:
  0 14px 40px rgba(16, 26, 56, 0.12);
```

Do not use heavy glowing shadows.

------------------------------------------------------------------------

# 8. Buttons

### Primary

``` css
background: #3255FD;
color: #FFFFFF;
```

Hover toward a slightly darker blue.

Use for:

-   Start assessment
-   Build my roadmap
-   Continue learning
-   Start project

### Secondary

White background with navy text and a subtle border.

### Accent

Use purple sparingly for secondary/highlight actions.

### Success

Use teal for completed/progress-related actions rather than making every
success state blue.

Buttons should generally be:

``` text
height: 44–48px
padding: 0 18–22px
border-radius: 10–12px
font-weight: 600
```

------------------------------------------------------------------------

# 9. Cards

Cards are a major part of Stackfit's UI.

Use:

``` css
background: #FFFFFF;
border: 1px solid #E4E8F0;
border-radius: 16px;
```

Cards should communicate one clear concept.

Examples:

-   Career path card
-   Skill card
-   Learning resource
-   Project
-   QCM question
-   Club
-   Roadmap milestone

### Career card structure

``` text
[Icon]

Full-Stack Development
Build modern web applications from frontend to backend.

12 concepts
8 projects
Beginner → Advanced

[Explore path →]
```

Do not overcrowd cards with every available piece of metadata.

------------------------------------------------------------------------

# 10. Career Path Visual Language

Stackfit has four primary career paths:

### Full-Stack Development

Use blue as the primary accent.

Suggested icon concepts:

-   Code
-   Brackets
-   Layers
-   Web application

### Cloud Engineering

Use cyan/blue.

Suggested icon concepts:

-   Cloud
-   Server
-   Infrastructure
-   Network

### Machine Learning

Use purple.

Suggested icon concepts:

-   Brain
-   Neural network
-   Spark
-   Model graph

### Data

Use teal.

Suggested icon concepts:

-   Bar chart
-   Database
-   Analytics
-   Trend line

Do not rely on color alone. Always include text/iconography.

------------------------------------------------------------------------

# 11. Skill / Concept UI

A concept should visually communicate:

``` text
Concept
↓
Difficulty
↓
Prerequisites
↓
Resources
↓
Practical project
↓
Assessment
```

Example:

``` text
React Frontend
Intermediate

Prerequisites
✓ JavaScript Fundamentals
✓ DOM & Browser APIs

Resources
3 available

Assessment
3 questions

[Learn concept]
```

Use small badges for difficulty:

``` text
Beginner      → soft blue
Intermediate  → soft purple
Advanced      → soft teal/navy
```

Do not use harsh red/orange to indicate difficulty.

------------------------------------------------------------------------

# 12. Roadmap UI

The roadmap is one of the most important Stackfit experiences.

Use a vertical progression:

``` text
✓ HTML & CSS
   │
✓ JavaScript
   │
→ React
   │
○ Backend APIs
   │
○ Databases
   │
○ Authentication
```

Recommended states:

-   Completed → teal
-   Current → blue
-   Upcoming → neutral gray
-   Locked → muted gray

The visual language should communicate **progress**, not punishment.

------------------------------------------------------------------------

# 13. Assessment / QCM UI

Questions should feel lightweight and interactive.

Example:

``` text
Question 2 of 3

Which HTTP method is commonly used
to retrieve a resource?

○ POST
○ GET
○ PATCH
○ DELETE

[Check answer]
```

After answering:

### Correct

Use teal and explain **why** the answer is correct.

### Incorrect

Use a restrained error treatment and immediately show the explanation.

Avoid making wrong answers feel humiliating.

------------------------------------------------------------------------

# 14. Progress Indicators

Use the brand gradient sparingly for major progress visuals:

``` css
background: linear-gradient(
  90deg,
  #8241FB,
  #3255FD,
  #01C8B1
);
```

Examples:

-   Roadmap progress
-   Skill completion
-   Assessment progress
-   Profile completion

Do not use gradients for every button or card.

------------------------------------------------------------------------

# 15. Hero Section

The homepage should immediately communicate the product.

Recommended structure:

``` text
Find your path.
Build what's next.

Discover the tech career that fits your skills,
then follow a practical roadmap to get there.

[Find my path]   [Explore careers]

             [Stackfit layered visual]
```

The hero should have generous whitespace.

A subtle blue/purple/teal gradient glow can sit behind the illustration,
but keep it extremely soft.

------------------------------------------------------------------------

# 16. Dashboard

The dashboard should answer three questions immediately:

1.  Where am I?
2.  What should I learn next?
3.  How close am I to my goal?

Suggested layout:

``` text
Good morning, Yassine

Your current path
Full-Stack Development

████████████░░░░ 72%

Continue learning
React Frontend

Recommended next
Authentication & Authorization

Your progress
[Concepts] [Projects] [Assessments]
```

Keep the first screen focused. Secondary information belongs lower on
the page.

------------------------------------------------------------------------

# 17. Responsive Design

Stackfit must be mobile-first.

### Mobile

-   One-column layouts
-   Bottom navigation if appropriate
-   Cards become full width
-   Hero typography scales down
-   Tables become cards or horizontally scroll
-   Roadmaps remain vertically readable

### Tablet

Use two-column grids where useful.

### Desktop

Use:

``` css
grid-template-columns:
  repeat(auto-fit, minmax(280px, 1fr));
```

Avoid layouts that depend on fixed desktop widths.

------------------------------------------------------------------------

# 18. Accessibility

Accessibility is part of the design system.

Always:

-   Use semantic HTML.
-   Provide labels for inputs.
-   Provide alt text where appropriate.
-   Ensure keyboard navigation.
-   Maintain readable contrast.
-   Do not communicate state using color alone.
-   Provide visible focus states.
-   Make clickable areas large enough for touch.

Focus example:

``` css
:focus-visible {
  outline: 3px solid rgba(47, 169, 244, 0.45);
  outline-offset: 2px;
}
```

------------------------------------------------------------------------

# 19. Icons

Use one consistent icon library.

Good style:

-   Simple
-   Outline-based
-   Geometric
-   1.5--2px stroke
-   Consistent sizing

Avoid mixing multiple icon styles.

Suggested sizes:

``` text
16px → metadata
20px → buttons
24px → cards
32–40px → career categories
48px+ → hero illustrations
```

------------------------------------------------------------------------

# 20. Empty States

Empty states should be helpful.

Bad:

``` text
No data.
```

Better:

``` text
Your roadmap is waiting.

Answer a few questions to discover
which path fits your current skills.

[Take the assessment]
```

Every empty state should tell the user what they can do next.

------------------------------------------------------------------------

# 21. Loading States

Prefer skeletons over generic spinners for content-heavy screens.

Example:

``` text
┌─────────────────────────────┐
│ ███████████████             │
│ █████████                   │
│                             │
│ ████████    ███████████     │
└─────────────────────────────┘
```

Skeletons should use the soft surface/border palette.

------------------------------------------------------------------------

# 22. Error States

Errors should be clear and actionable.

``` text
We couldn't load your roadmap.

Your progress is safe. Try again.

[Try again]
```

Avoid technical stack traces in the normal user interface.

------------------------------------------------------------------------

# 23. Frontend Component Naming

Use reusable components rather than page-specific duplicated UI.

Suggested components:

``` text
Button
Badge
Card
CareerCard
ConceptCard
ResourceCard
ProgressBar
Roadmap
RoadmapNode
QuestionCard
OptionButton
Modal
Toast
Navbar
Footer
EmptyState
LoadingSkeleton
ErrorState
```

------------------------------------------------------------------------

# 24. Recommended Page Structure

### `/`

Landing page.

### `/careers`

Four career paths.

### `/careers/:slug`

Career overview, concepts, roadmap, resources and projects.

### `/assessment`

QCM-based skill assessment.

### `/roadmap`

Personalized learning roadmap.

### `/projects`

Taster projects and practical work.

### `/resources`

Searchable learning resources.

### `/clubs`

Tunisian student clubs and communities.

### `/dashboard`

Personal progress and recommendations.

### `/profile`

Skills, completed concepts, interests and career direction.

------------------------------------------------------------------------

# 25. Design Principle

The most important Stackfit principle:

> **Show the user what to do next.**

Every major screen should have a clear next action.

Examples:

``` text
Career discovery → Take assessment
Assessment → View matching paths
Career path → Start roadmap
Concept → Learn
Resource → Open resource
Project → Start project
Completed concept → Continue to next concept
```

The interface should feel like a **guided journey**, not a database
browser.

------------------------------------------------------------------------

# 26. Do / Don't

## Do

-   Use navy as the visual anchor.
-   Use blue for primary interaction.
-   Use purple and teal as controlled accents.
-   Use generous whitespace.
-   Keep cards simple.
-   Make progress visible.
-   Make the next action obvious.
-   Use consistent iconography.
-   Keep mobile usability first-class.

## Don't

-   Use rainbow gradients.
-   Make every component colorful.
-   Use excessive shadows.
-   Overuse glassmorphism.
-   Put huge amounts of text inside cards.
-   Hide the user's next step.
-   Use color as the only status indicator.
-   Make the UI look like a generic LMS.

------------------------------------------------------------------------

# 27. Quick Visual Reference

``` text
NAVY       #0B1633   █████
BLUE       #3255FD   █████
PURPLE     #8241FB   █████
CYAN       #2FA9F4   █████
TEAL       #01C8B1   █████
GRAY       #596273   █████
SURFACE    #FFFFFF   █████
SOFT       #F6F8FC   █████
BORDER     #E4E8F0   █████
```

### Stackfit visual formula

``` text
Navy foundation
      +
Blue interaction
      +
Purple discovery
      +
Teal progress
      +
Large whitespace
      +
Clear next action
      =
STACKFIT
```

When in doubt, prefer **clarity and progression over decoration**.

# 28. React Implementation & Smooth UX

This section defines how Stackfit should be implemented in React so the interface feels fast, stable, responsive, and easy to maintain.

## 28.1 Component architecture

Prefer small, focused components with clear responsibilities.

Recommended structure:

```text
src/
  app/
  components/
    ui/
    navigation/
    career/
    roadmap/
    assessment/
    resources/
  features/
    careers/
    assessment/
    roadmap/
    profile/
  hooks/
  lib/
  services/
  types/
```

Guidelines:

- Keep reusable visual primitives in `components/ui`.
- Keep career-specific logic close to the career feature.
- Keep API/data access out of presentational components.
- Prefer composition over giant components with many conditional branches.
- Keep components focused enough that their behavior can be understood quickly.

## 28.2 Keep rendering pure

React rendering should be predictable: given the same props, state, and context, a component should produce the same UI.

Avoid side effects during render. Use event handlers or Effects when synchronization with an external system is actually required.

Do not use memoization to hide rendering bugs. Fix unnecessary renders and Effects before adding performance optimizations.

## 28.3 State management: keep state as local as possible

Prefer local state for transient UI state:

- Modal open/closed
- Selected tab
- Input value
- Hover state
- QCM answer selection
- Temporary filters

Do not put every piece of state into a global store.

Avoid redundant state. If a value can be calculated from existing props/state during render, calculate it instead of storing another copy.

```jsx
// ❌ Redundant state
const [firstName, setFirstName] = useState("Yassine");
const [displayName, setDisplayName] = useState("Yassine");

// ✅ Derived value
const displayName = firstName.trim();
```

## 28.4 Avoid unnecessary useEffect

Do not use `useEffect` simply to derive state from other state.

```jsx
// ❌ Unnecessary Effect
const [filtered, setFiltered] = useState([]);

useEffect(() => {
  setFiltered(resources.filter(matchesSearch));
}, [resources, search]);
```

Prefer:

```jsx
// ✅ Derived during render
const filtered = resources.filter(matchesSearch);
```

Use Effects primarily when synchronizing React with something outside React, such as browser APIs, WebSockets, timers, subscriptions, or non-React libraries.

## 28.5 Do not overuse memoization

Do not automatically wrap every component in `memo`, `useMemo`, or `useCallback`.

Current React documentation notes that React Compiler can automatically memoize values, functions, and components when enabled. Manual memoization should therefore be targeted rather than used everywhere.

Use memoization when profiling shows a real bottleneck, for example:

- A large resource list is expensive to render.
- A complex roadmap calculation is repeated unnecessarily.
- A memoized child receives genuinely stable props.

Prefer simple code first.

```jsx
const nextConcept = concepts.find(c => !c.completed);
```

Use `useMemo` for expensive calculations with stable dependencies:

```jsx
const filteredResources = useMemo(
  () => expensiveFilter(resources, filters),
  [resources, filters]
);
```

Use `memo` for an actually expensive child whose props frequently remain unchanged.

## 28.6 Use stable keys

Use stable database identifiers when rendering lists:

```jsx
{concepts.map(concept => (
  <ConceptCard key={concept.slug} concept={concept} />
))}
```

Avoid array indexes when list order can change. Stable keys help React preserve the correct component identity when roadmap items, resources, or assessment options change.

## 28.7 Keep interactions immediate

A user should receive visual feedback immediately after an action.

Examples:

- Button click → pressed/disabled state immediately.
- QCM answer → selected option highlighted immediately.
- Roadmap completion → progress updates immediately.
- Save action → pending state, then success/error.
- Navigation → preserve already-visible content while the next screen loads.

For non-urgent rendering work, React's `useTransition` can keep urgent interactions responsive while background UI updates are processed.

```jsx
const [isPending, startTransition] = useTransition();

function selectCareer(slug) {
  startTransition(() => {
    setSelectedCareer(slug);
  });
}
```

Use transitions for genuinely non-urgent UI updates, not for basic button state or controlled text input.

## 28.8 Search and filtering UX

Stackfit contains resource, concept, club, and career lists. Searching should feel instant.

Recommended behavior:

- Keep the input responsive.
- Debounce expensive server requests when appropriate.
- Cancel or ignore stale requests.
- Show the current filter state clearly.
- Preserve filters when navigating back.
- Show a useful empty state instead of a blank page.

For large client-side lists, defer expensive filtering/rendering rather than making typing wait for the entire list to update.

## 28.9 Loading UX

Never make the entire application disappear behind a spinner for a small piece of loading content.

Prefer:

```text
Page shell remains visible
        ↓
Skeleton for the loading section
        ↓
Real content replaces skeleton
```

Use skeletons for career cards, resource cards, dashboard statistics, roadmap nodes, and profile sections.

For small actions, use a button-level pending state instead of replacing the whole screen:

```text
[✓ Saved]
[Saving…]
[Save]
```

## 28.10 Error handling

Every async feature should have deliberate loading, success, and error states.

```text
loading → success
        ↘ error
```

Errors should be recoverable where possible:

```text
We couldn't load your roadmap.
Your progress is safe.

[Try again]
```

Do not expose raw API errors, stack traces, or database errors to normal users.

## 28.11 Optimistic UI

For safe, reversible actions, update the interface immediately and reconcile with the server.

Good candidates:

- Mark concept complete
- Toggle a bookmark
- Save a resource
- Update a preference

Always provide a rollback/error path if the server rejects the change.

## 28.12 Data fetching

Keep data fetching separate from visual components where practical.

Recommended pattern:

```text
Page
 ↓
Feature hook / loader
 ↓
API service
 ↓
Backend
```

The UI should explicitly model:

```text
idle / loading / success / error
```

Avoid firing the same request repeatedly because of unstable Effect dependencies. Prefer a dedicated data-fetching/cache layer when the application becomes large enough to benefit from request deduplication, caching, retries, and stale-data handling.

## 28.13 Code splitting and lazy loading

Do not load every Stackfit feature on the initial page.

Good candidates for lazy loading:

- Assessment experience
- Dashboard charts
- Club/event views
- Large resource explorers
- Admin screens

Keep the landing page and first meaningful interaction lightweight.

Pair lazy-loaded routes/components with a useful Suspense fallback that matches the surrounding layout instead of showing a blank screen.

## 28.14 Images and assets

Use appropriately sized images and avoid shipping a huge asset when a small version is sufficient.

For the Stackfit logo:

- Prefer SVG for the production logo when available.
- Keep intrinsic dimensions defined.
- Avoid layout shifts while images load.
- Do not add unnecessary visual effects around the logo.

For decorative images, lazy-load below-the-fold assets where appropriate.

## 28.15 Prevent layout shift

The UI should not jump while content loads.

Always reserve space for:

- Images
- Avatars
- Charts
- Async cards
- Navigation elements

Skeleton dimensions should closely match the final component dimensions.

Avoid injecting content above the user's current reading position after initial render unless the user explicitly triggered it.

## 28.16 Forms and QCMs

Forms should feel immediate and forgiving.

For Stackfit assessments:

1. Select an answer immediately.
2. Make the selected state obvious.
3. Disable accidental double submission.
4. Show progress such as `Question 2 of 3`.
5. After submission, explain why the answer is correct.
6. Preserve progress if the user navigates temporarily away.
7. Never erase an answer because of an unrelated render.

For validation, show errors close to the affected field and do not wait until the final submission when the problem can be detected earlier.

## 28.17 Accessibility in React

Use semantic HTML before custom ARIA.

Examples:

```jsx
<button onClick={handleNext}>Next</button>
```

not:

```jsx
<div onClick={handleNext}>Next</div>
```

Also:

- Keep keyboard navigation functional.
- Preserve visible focus states.
- Associate labels with inputs.
- Use `aria-live` for important asynchronous status messages when appropriate.
- Do not use color alone for correct/incorrect/progress states.
- Respect reduced-motion preferences.

## 28.18 Motion and micro-interactions

Stackfit should feel alive but not distracting.

Use short transitions for:

- Hover
- Focus
- Card elevation
- Progress changes
- Navigation
- Modal entry/exit

Recommended default duration:

```css
transition-duration: 150ms–220ms;
```

Prefer transform/opacity animations over expensive layout animations.

Respect:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 28.19 Mobile-first performance

Stackfit should remain usable on modest mobile hardware and slower networks.

Priorities:

1. Fast initial content.
2. Responsive taps and typing.
3. Small JavaScript bundles.
4. Optimized images.
5. Minimal unnecessary requests.
6. Cached/reused data where appropriate.
7. Avoid rendering hundreds of off-screen cards at once.

For very large lists, use pagination, incremental loading, or virtualization instead of rendering everything.

## 28.20 Performance debugging

Do not optimize by intuition alone.

When an interaction feels slow:

1. Reproduce it on a throttled device/network.
2. Use React DevTools Profiler.
3. Identify the expensive component/calculation.
4. Check for unnecessary state updates and Effects.
5. Fix the data flow first.
6. Add targeted memoization only if the profile supports it.
7. Re-test in a production build.

A smooth Stackfit experience is measured by how quickly users can understand and act, not by how many optimizations appear in the code.

## 28.21 Stackfit UX performance checklist

Before shipping a screen, verify:

- [ ] First meaningful content appears quickly.
- [ ] No unnecessary full-page spinner.
- [ ] Buttons provide immediate feedback.
- [ ] Forms do not lose user input.
- [ ] Loading states preserve layout.
- [ ] Errors explain what happened and what to do next.
- [ ] Lists use stable keys.
- [ ] Derived data is not duplicated in state.
- [ ] Effects are used only when synchronization is required.
- [ ] Large lists are paginated, deferred, or virtualized when necessary.
- [ ] Heavy routes/components are lazy-loaded where appropriate.
- [ ] Images have reserved dimensions.
- [ ] Keyboard navigation works.
- [ ] Reduced motion is respected.
- [ ] React DevTools profiling has been used for any suspected bottleneck.

---

# 29. React Reference Sources

Use the official React documentation as the source of truth when React behavior or APIs change:

- React state management: https://react.dev/learn/managing-state
- Choosing state structure: https://react.dev/learn/choosing-the-state-structure
- Hooks and rendering optimization: https://react.dev/reference/react/hooks
- `useMemo`: https://react.dev/reference/react/useMemo
- `memo`: https://react.dev/reference/react/memo
- `useCallback`: https://react.dev/reference/react/useCallback
- `useTransition`: https://react.dev/reference/react/useTransition
- React Compiler: https://react.dev/learn/react-compiler/introduction

These recommendations were checked against the current React documentation on 2026-09-26.

---

# 30. Final Stackfit Rule

The frontend should optimize for this sequence:

```text
Understand
   ↓
Choose
   ↓
Act
   ↓
See progress
   ↓
Continue
```

Every technical decision should support that user journey.

**Fast is good. Clear is better. Fast + clear + reassuring is Stackfit.**
