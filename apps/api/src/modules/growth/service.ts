import { prisma } from '../../prisma.js';
import {
  certificationProgress,
  type CertificationCriteria,
  type MasteryInput,
} from '../../progress/progress.js';

/** Loads everything eligibility needs for one user, keyed by concept SLUG. */
export async function loadMastery(userId: number): Promise<MasteryInput> {
  const [attempts, steps, known, tasters, interviews] = await Promise.all([
    prisma.quizAttempt.findMany({ where: { userId }, select: { conceptId: true, score: true, passed: true } }),
    prisma.roadmapStep.findMany({
      where: { roadmap: { userId }, status: { in: ['quiz_passed', 'interview_passed'] } },
      select: { conceptId: true },
    }),
    prisma.userKnownConcept.findMany({ where: { userId, source: 'quiz' }, select: { conceptId: true } }),
    prisma.userTaster.findMany({
      where: { userId, status: 'reviewed' },
      select: { taster: { select: { fieldId: true } } },
    }),
    prisma.interview.count({ where: { userId, passed: true } }),
  ]);

  const idToSlug = new Map(
    (await prisma.concept.findMany({ select: { id: true, slug: true } })).map((c) => [c.id, c.slug]),
  );
  const bestScores = new Map<string, number>();
  for (const a of attempts) {
    if (!a.passed) continue;
    const slug = idToSlug.get(a.conceptId);
    if (!slug) continue;
    bestScores.set(slug, Math.max(bestScores.get(slug) ?? -1, a.score));
  }
  const toSlugs = (ids: number[]): Set<string> =>
    new Set(ids.map((id) => idToSlug.get(id)).filter((s): s is string => !!s));

  return {
    bestScores,
    stepPassed: toSlugs(steps.map((s) => s.conceptId)),
    knownQuiz: toSlugs(known.map((k) => k.conceptId)),
    reviewedTasterFieldIds: new Set(tasters.map((t) => t.taster.fieldId)),
    passedInterviews: interviews,
  };
}

export interface AwardResult {
  awarded: string[]; // slugs newly awarded in this call
  pending: Array<{ slug: string; title: string; missingConcepts: string[]; needsTaster: boolean; needsInterviews: number }>;
}

/**
 * Evaluates all live certifications for the user and persists newly earned
 * ones with an evidence snapshot. Idempotent — re-running changes nothing.
 * Call this after every quiz pass (and expose via POST …/check).
 */
export async function evaluateAndAward(userId: number): Promise<AwardResult> {
  const [certs, mastery, earned] = await Promise.all([
    prisma.certification.findMany({ where: { status: 'approved' } }),
    loadMastery(userId),
    prisma.userCertification.findMany({ where: { userId }, select: { certificationId: true } }),
  ]);
  const earnedIds = new Set(earned.map((e) => e.certificationId));
  const awarded: string[] = [];
  const pending: AwardResult['pending'] = [];

  for (const cert of certs) {
    if (earnedIds.has(cert.id)) continue;
    const progress = certificationProgress(
      cert.criteria as unknown as CertificationCriteria,
      cert.fieldId,
      mastery,
    );
    if (progress.eligible) {
      await prisma.userCertification.create({
        data: {
          userId,
          certificationId: cert.id,
          evidence: {
            awarded_from: 'quiz_progress',
            missing_at_award: [],
            best_scores: Object.fromEntries(
              ((cert.criteria as unknown as CertificationCriteria).required_concepts ?? []).map((s) => [
                s,
                mastery.bestScores.get(s) ?? null,
              ]),
            ),
          },
        },
      });
      awarded.push(cert.slug);
    } else {
      pending.push({ slug: cert.slug, title: cert.title, ...progress });
    }
  }
  return { awarded, pending };
}
