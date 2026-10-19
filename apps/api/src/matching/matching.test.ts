import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRoadmap,
  fitScore,
  knownAndLiked,
  rankFields,
  type ConceptInput,
  type FieldInput,
} from './matching.js';

const concepts = new Map<number, ConceptInput>([
  [1, { id: 1, slug: 'a', level: 'beginner' }],
  [2, { id: 2, slug: 'b', level: 'beginner' }],
  [3, { id: 3, slug: 'c', level: 'intermediate' }],
]);

const fields: FieldInput[] = [
  { id: 1, slug: 'f1', concepts: [{ conceptId: 1, importance: 5 }, { conceptId: 3, importance: 5 }] },
  { id: 2, slug: 'f2', concepts: [{ conceptId: 2, importance: 5 }] },
];

describe('knownAndLiked', () => {
  it('maps confidence/interest through item strength (max wins)', () => {
    const itemConcepts = new Map([[7, [{ conceptId: 1, strength: 5 }]]]);
    const { known, liked } = knownAndLiked(
      [{ itemId: 7, confidence: 4, interest: 2 }],
      itemConcepts,
    );
    assert.equal(known.get(1), 1 * (4 / 5));
    assert.equal(liked.get(1), 1 * (2 / 5));
  });

  it('returns empty maps for unknown items', () => {
    const { known, liked } = knownAndLiked([{ itemId: 999, confidence: 5, interest: 5 }], new Map());
    assert.equal(known.size, 0);
    assert.equal(liked.size, 0);
  });
});

describe('rankFields', () => {
  it('ranks the best-known field first with relativeScore 1', () => {
    const known = new Map([[1, 1]]);
    const ranked = rankFields(fields, known, new Map());
    assert.equal(ranked[0].slug, 'f1');
    assert.equal(ranked[0].relativeScore, 1);
    assert.ok(ranked[1].relativeScore < 1);
    assert.deepEqual(ranked[0].matchedConcepts, [1]);
  });

  it('respects topN', () => {
    assert.equal(rankFields(fields, new Map(), new Map(), 1).length, 1);
  });
});

describe('fitScore', () => {
  it('returns null fit when no taster was completed', () => {
    const r = fitScore(0.8, null);
    assert.equal(r.fit, null);
    assert.equal(r.complete, false);
  });

  it('weights skill/enjoyment/performance', () => {
    const r = fitScore(1, { tasters_done: 1, avg_enjoyment: 5, avg_performance: 1 });
    assert.equal(r.complete, true);
    assert.ok(Math.abs((r.fit as number) - 1) < 1e-9);
  });
});

describe('buildRoadmap', () => {
  it('orders prerequisites first (Kahn)', () => {
    const prereqs = new Map([[3, [1, 2]]]);
    const order = buildRoadmap(fields[0], concepts, prereqs, new Map());
    const pos = new Map(order.map((s, i) => [s.conceptId, i]));
    assert.ok((pos.get(1) as number) < (pos.get(3) as number));
    assert.ok((pos.get(2) as number) < (pos.get(3) as number));
  });

  it('skips already-known concepts and their satisfied edges', () => {
    const order = buildRoadmap(fields[1], concepts, new Map(), new Map([[2, 0.9]]));
    assert.equal(order.length, 0);
  });

  it('throws on prerequisite cycles (seed bug)', () => {
    const prereqs = new Map([[1, [3]], [3, [1]]]);
    assert.throws(() => buildRoadmap(fields[0], concepts, prereqs, new Map()), /Cycle detected/);
  });
});
