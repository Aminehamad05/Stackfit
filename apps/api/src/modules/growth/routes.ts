import { Router, type NextFunction, type Response } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';
import {
  PROJECT_MIN_SCORE,
  certificationProgress,
  projectReadiness,
  type CertificationCriteria,
} from '../../progress/progress.js';
import { evaluateAndAward, loadMastery } from './service.js';

const r = Router();

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

// GET /api/users/me/certifications — earned (with award date) + in-progress with what's missing.
r.get(
  '/users/me/certifications',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = userIdOf(req);
      const [certs, mastery, earned] = await Promise.all([
        prisma.certification.findMany({ where: { status: 'approved' }, include: { field: true } }),
        loadMastery(userId),
        prisma.userCertification.findMany({ where: { userId }, include: { certification: true } }),
      ]);
      const earnedIds = new Set(earned.map((e) => e.certificationId));
      res.json({
        earned: earned.map((e) => ({
          slug: e.certification.slug,
          title: e.certification.title,
          awardedAt: e.awardedAt,
        })),
        inProgress: certs
          .filter((c) => !earnedIds.has(c.id))
          .map((c) => ({
            slug: c.slug,
            title: c.title,
            field: c.field?.slug ?? null,
            ...certificationProgress(c.criteria as unknown as CertificationCriteria, c.fieldId, mastery),
          })),
      });
    } catch (e) {
      next(e);
    }
  },
);

// POST /api/users/me/certifications/check — evaluate now, award newly earned.
// Call after each quiz pass (the quiz module will call evaluateAndAward directly).
r.post(
  '/users/me/certifications/check',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(await evaluateAndAward(userIdOf(req)));
    } catch (e) {
      next(e);
    }
  },
);

// GET /api/users/me/project-suggestions — ready first, then closest-to-ready.
// "Ready" = every required concept mastered (quiz score >= PROJECT_MIN_SCORE
// or passed via roadmap/known-concepts). Suggested the moment the user is ready
// to turn course knowledge into a real build.
r.get(
  '/users/me/project-suggestions',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mastery = loadMastery(userIdOf(req));
      const suggestions = await prisma.projectSuggestion.findMany({
        where: { status: 'approved' },
        include: { field: true },
      });
      const m = await mastery;
      const ranked = suggestions
        .map((s) => {
          const required = (s.requiredConcepts as unknown as string[]) ?? [];
          return {
            slug: s.slug,
            title: s.title,
            description: s.description,
            field: s.field?.slug ?? null,
            level: s.level,
            estHours: s.estHours,
            deliverableHint: s.deliverableHint,
            ...projectReadiness(required, m),
          };
        })
        .sort((a, b) => {
          if (a.ready !== b.ready) return a.ready ? -1 : 1;
          const pa = a.total ? a.mastered / a.total : 0;
          const pb = b.total ? b.mastered / b.total : 0;
          return pb - pa;
        });
      res.json({ suggestions: ranked, thresholds: { projectMinScore: PROJECT_MIN_SCORE } });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
