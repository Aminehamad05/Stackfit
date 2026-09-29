import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  certificationProgress,
  isConceptMastered,
  projectReadiness,
  type MasteryInput,
} from './progress.js';

function mastery(over: Partial<MasteryInput> = {}): MasteryInput {
  return {
    bestScores: new Map(),
    stepPassed: new Set(),
    knownQuiz: new Set(),
    reviewedTasterFieldIds: new Set(),
    passedInterviews: 0,
    ...over,
  };
}

describe('isConceptMastered', () => {
  it('passes on quiz score, roadmap step, or known-concept source', () => {
    assert.equal(isConceptMastered('a', mastery({ bestScores: new Map([['a', 0.8]]) }), 0.7), true);
    assert.equal(isConceptMastered('a', mastery({ bestScores: new Map([['a', 0.5]]) }), 0.7), false);
    assert.equal(isConceptMastered('a', mastery({ stepPassed: new Set(['a']) }), 0.7), true);
    assert.equal(isConceptMastered('a', mastery({ knownQuiz: new Set(['a']) }), 0.7), true);
  });
});

describe('certificationProgress', () => {
  const criteria = { required_concepts: ['a', 'b'], min_score: 0.7, require_taster: true };

  it('eligible only when concepts + taster satisfied', () => {
    const full = mastery({
      bestScores: new Map([['a', 0.9], ['b', 0.8]]),
      reviewedTasterFieldIds: new Set([4]),
    });
    const r = certificationProgress(criteria, 4, full);
    assert.equal(r.eligible, true);
    assert.deepEqual(r.missingConcepts, []);
    assert.equal(r.needsTaster, false);
  });

  it('reports missing concepts and taster gaps separately', () => {
    const r = certificationProgress(criteria, 4, mastery({ bestScores: new Map([['a', 0.9]]) }));
    assert.equal(r.eligible, false);
    assert.deepEqual(r.missingConcepts, ['b']);
    assert.equal(r.needsTaster, true);
  });

  it('does not require a taster in another field', () => {
    const m = mastery({ bestScores: new Map([['a', 1], ['b', 1]]), reviewedTasterFieldIds: new Set([1]) });
    assert.equal(certificationProgress(criteria, 4, m).needsTaster, true);
  });
});

describe('projectReadiness', () => {
  it('ready only when every required concept is mastered', () => {
    const m = mastery({ bestScores: new Map([['a', 0.9], ['b', 0.9]]) });
    assert.deepEqual(projectReadiness(['a', 'b'], m), { ready: true, mastered: 2, total: 2, missing: [] });
    const partial = projectReadiness(['a', 'b', 'c'], m);
    assert.equal(partial.ready, false);
    assert.deepEqual(partial.missing, ['c']);
  });
});
