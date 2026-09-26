// progress.ts — rule-based growth eligibility. PURE: no DB, no AI.
// Certifications award when "important courses" are done; projects surface
// when the user masters their required concepts. Tune thresholds here.

export interface CertificationCriteria {
  required_concepts: string[]; // concept slugs
  min_score?: number; // quiz mastery threshold, default DEFAULT_MIN_SCORE
  require_taster?: boolean; // a reviewed taster in the cert's field
  min_interviews_passed?: number; // default 0 (interviews are AI-blocked)
}

export const DEFAULT_MIN_SCORE = 0.7;
export const PROJECT_MIN_SCORE = 0.6;

export interface MasteryInput {
  bestScores: Map<string, number>; // concept slug -> best quiz score (-1 if never tried)
  stepPassed: Set<string>; // slugs passed via roadmap_steps (quiz/interview_passed)
  knownQuiz: Set<string>; // slugs in user_known_concepts(source=quiz)
  reviewedTasterFieldIds: Set<number>; // field ids with a reviewed taster
  passedInterviews: number;
}

export function isConceptMastered(slug: string, input: MasteryInput, minScore: number): boolean {
  return (
    (input.bestScores.get(slug) ?? -1) >= minScore ||
    input.stepPassed.has(slug) ||
    input.knownQuiz.has(slug)
  );
}

export interface CertificationProgress {
  eligible: boolean;
  missingConcepts: string[];
  needsTaster: boolean;
  needsInterviews: number;
}

export function certificationProgress(
  criteria: CertificationCriteria,
  certFieldId: number | null,
  input: MasteryInput,
): CertificationProgress {
  const minScore = criteria.min_score ?? DEFAULT_MIN_SCORE;
  const missingConcepts = (criteria.required_concepts ?? []).filter(
    (s) => !isConceptMastered(s, input, minScore),
  );
  const needsTaster =
    (criteria.require_taster ?? false) &&
    (certFieldId === null || !input.reviewedTasterFieldIds.has(certFieldId));
  const needInterviews = criteria.min_interviews_passed ?? 0;
  const needsInterviews = Math.max(0, needInterviews - input.passedInterviews);
  return {
    eligible: missingConcepts.length === 0 && !needsTaster && needsInterviews === 0,
    missingConcepts,
    needsTaster,
    needsInterviews,
  };
}

export interface ProjectReadiness {
  ready: boolean;
  mastered: number;
  total: number;
  missing: string[];
}

export function projectReadiness(required: string[], input: MasteryInput): ProjectReadiness {
  const missing = required.filter((s) => !isConceptMastered(s, input, PROJECT_MIN_SCORE));
  return { ready: missing.length === 0, mastered: required.length - missing.length, total: required.length, missing };
}
