// matching.mjs: field matching, taster fit score and roadmap ordering.
// Pure functions with no dependencies. Load rows from Postgres, pass them in.
// Run the demo with:  node matching.mjs

import { fileURLToPath } from 'node:url';

// ---- Tunable weights (adjust after testing with real users) ----
export const MATCH_WEIGHTS = { known: 0.6, liked: 0.4 };          // what you know vs what you enjoy
// Once the user has actually tried a field, real experience should outweigh the prior skill guess.
export const FIT_WEIGHTS   = { skill: 0.2, enjoyment: 0.5, performance: 0.3 };
export const KNOWN_THRESHOLD = 0.5;  // a concept counts as "known" at or above this strength (0..1)

const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };

/**
 * Step 1: turn the user's onboarding answers into two maps over concepts.
 * background:   [{ itemId, confidence (1-5), interest (1-5) }]
 * itemConcepts: Map<itemId, [{ conceptId, strength (1-5) }]>  (background_item_concepts)
 * Returns { known: Map<conceptId, 0..1>, liked: Map<conceptId, 0..1> }
 */
export function knownAndLiked(background, itemConcepts) {
  const known = new Map();
  const liked = new Map();
  for (const b of background) {
    for (const { conceptId, strength } of itemConcepts.get(b.itemId) ?? []) {
      const s = strength / 5;
      known.set(conceptId, Math.max(known.get(conceptId) ?? 0, s * (b.confidence / 5)));
      liked.set(conceptId, Math.max(liked.get(conceptId) ?? 0, s * (b.interest / 5)));
    }
  }
  return { known, liked };
}

/**
 * Step 2: rank fields for this user.
 * fields: [{ id, slug, concepts: [{ conceptId, importance (1-5) }] }]  (field_concepts)
 * Scores are importance-weighted averages, so beginners get low absolute scores.
 * The ranking and `relativeScore` (best field = 1) are what you should display.
 */
export function rankFields(fields, known, liked, topN = 3) {
  const scored = fields.map((f) => {
    const total = f.concepts.reduce((a, c) => a + c.importance, 0) || 1;
    let k = 0;
    let l = 0;
    const matchedConcepts = [];
    for (const c of f.concepts) {
      const kv = known.get(c.conceptId) ?? 0;
      k += c.importance * kv;
      l += c.importance * (liked.get(c.conceptId) ?? 0);
      if (kv >= KNOWN_THRESHOLD) matchedConcepts.push(c.conceptId);
    }
    const skillMatch = k / total;
    const interestMatch = l / total;
    return {
      fieldId: f.id,
      slug: f.slug,
      score: MATCH_WEIGHTS.known * skillMatch + MATCH_WEIGHTS.liked * interestMatch,
      skillMatch,
      interestMatch,
      matchedConcepts, // feed these to the LLM for the "why this fits you" text
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.score || 1;
  return scored.slice(0, topN).map((s) => ({ ...s, relativeScore: s.score / best }));
}

/**
 * Step 3: after tasters, combine the three signals into one fit score per field.
 * relativeSkill: the field's relativeScore from rankFields (0..1)
 * inputs: a row of field_fit_inputs, or null if no taster was completed
 *   { tasters_done, avg_enjoyment (1-5), avg_performance (0-1) }
 * Fields with no completed taster get fit = null ("not tried yet"): never rank an untried
 * field against a tried one, because the two scores are not comparable.
 * The score only informs the user; the user makes the final choice.
 */
export function fitScore(relativeSkill, inputs) {
  if (!inputs || !inputs.tasters_done) {
    return { fit: null, complete: false, parts: { skill: relativeSkill } };
  }
  const enjoyment = (inputs.avg_enjoyment - 1) / 4; // 1..5 -> 0..1
  const performance = inputs.avg_performance;
  const fit =
    FIT_WEIGHTS.skill * relativeSkill +
    FIT_WEIGHTS.enjoyment * enjoyment +
    FIT_WEIGHTS.performance * performance;
  return { fit, complete: true, parts: { skill: relativeSkill, enjoyment, performance } };
}

/**
 * Step 4: build the roadmap for a chosen field.
 * concepts: Map<id, { id, slug, level }>
 * prereqs:  Map<conceptId, prereqId[]>  (concept_prerequisites)
 * Collects the missing required concepts plus their missing prerequisites,
 * then orders them so every prerequisite comes first (Kahn's algorithm).
 * Ties: lower level first, then higher importance first.
 */
export function buildRoadmap(field, concepts, prereqs, known) {
  const need = new Set();
  const visit = (id) => {
    if (need.has(id) || (known.get(id) ?? 0) >= KNOWN_THRESHOLD) return;
    need.add(id);
    for (const p of prereqs.get(id) ?? []) visit(p);
  };
  field.concepts.forEach((c) => visit(c.conceptId));

  const importance = new Map(field.concepts.map((c) => [c.conceptId, c.importance]));
  const indegree = new Map([...need].map((id) => [id, 0]));
  const dependents = new Map();
  for (const id of need) {
    for (const p of prereqs.get(id) ?? []) {
      if (!need.has(p)) continue;
      indegree.set(id, indegree.get(id) + 1);
      if (!dependents.has(p)) dependents.set(p, []);
      dependents.get(p).push(id);
    }
  }

  const byPriority = (a, b) =>
    LEVEL_RANK[concepts.get(a).level] - LEVEL_RANK[concepts.get(b).level] ||
    (importance.get(b) ?? 0) - (importance.get(a) ?? 0);

  const ready = [...need].filter((id) => indegree.get(id) === 0);
  const order = [];
  while (ready.length) {
    ready.sort(byPriority);
    const id = ready.shift();
    order.push(id);
    for (const d of dependents.get(id) ?? []) {
      indegree.set(d, indegree.get(d) - 1);
      if (indegree.get(d) === 0) ready.push(d);
    }
  }
  if (order.length !== need.size) throw new Error('Cycle detected in concept_prerequisites');
  return order.map((id, i) => ({ position: i + 1, conceptId: id, slug: concepts.get(id).slug }));
}

// ---------------------------------------------------------------- demo
function demo() {
  const C = (id, slug, level) => [id, { id, slug, level }];
  const concepts = new Map([
    C(1, 'linear-algebra', 'intermediate'), C(2, 'python-basics', 'beginner'),
    C(3, 'linux-cli', 'beginner'), C(4, 'git-basics', 'beginner'),
    C(5, 'bash-scripting', 'beginner'), C(6, 'pandas', 'intermediate'),
    C(7, 'statistics', 'intermediate'), C(8, 'docker', 'intermediate'),
    C(9, 'ci-cd', 'intermediate'), C(10, 'ml-basics', 'advanced'),
  ]);
  const prereqs = new Map([
    [5, [3]], [6, [2]], [7, [1]], [8, [3]], [9, [4, 8]], [10, [1, 2, 7]],
  ]);
  const fields = [
    { id: 1, slug: 'data-analysis', concepts: [
      { conceptId: 2, importance: 5 }, { conceptId: 6, importance: 5 },
      { conceptId: 7, importance: 4 }, { conceptId: 1, importance: 2 } ] },
    { id: 2, slug: 'devops', concepts: [
      { conceptId: 3, importance: 5 }, { conceptId: 4, importance: 4 },
      { conceptId: 8, importance: 5 }, { conceptId: 9, importance: 5 },
      { conceptId: 5, importance: 3 } ] },
    { id: 3, slug: 'machine-learning', concepts: [
      { conceptId: 1, importance: 5 }, { conceptId: 2, importance: 4 },
      { conceptId: 7, importance: 4 }, { conceptId: 10, importance: 5 } ] },
  ];
  // background items: 1 = Linear algebra course, 2 = Linux, 3 = Git/GitHub
  const itemConcepts = new Map([
    [1, [{ conceptId: 1, strength: 5 }, { conceptId: 7, strength: 2 }]],
    [2, [{ conceptId: 3, strength: 5 }, { conceptId: 5, strength: 3 }]],
    [3, [{ conceptId: 4, strength: 5 }]],
  ]);
  const background = [
    { itemId: 1, confidence: 4, interest: 5 },
    { itemId: 2, confidence: 4, interest: 4 },
    { itemId: 3, confidence: 3, interest: 4 },
  ];

  const { known, liked } = knownAndLiked(background, itemConcepts);
  const ranked = rankFields(fields, known, liked);
  console.log('Top fields:');
  for (const r of ranked) {
    console.log(`  ${r.slug.padEnd(17)} relative=${r.relativeScore.toFixed(2)} skill=${r.skillMatch.toFixed(2)} interest=${r.interestMatch.toFixed(2)}`);
  }

  console.log('\nFit after tasters (data-analysis loved, devops so-so):');
  const inputs = {
    'data-analysis': { tasters_done: 1, avg_enjoyment: 5, avg_performance: 0.8 },
    devops: { tasters_done: 1, avg_enjoyment: 3, avg_performance: 0.9 },
  };
  for (const r of ranked) {
    const f = fitScore(r.relativeScore, inputs[r.slug] ?? null);
    console.log(`  ${r.slug.padEnd(17)} fit=${f.fit === null ? 'not tried yet' : f.fit.toFixed(2)}`);
  }

  console.log('\nRoadmap for devops:');
  const devops = fields.find((f) => f.slug === 'devops');
  for (const s of buildRoadmap(devops, concepts, prereqs, known)) console.log(`  ${s.position}. ${s.slug}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) demo();
