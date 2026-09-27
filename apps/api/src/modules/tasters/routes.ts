import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';
import { idParam, tasterIdParam } from '../../schemas/common.js';
import { projectReadiness } from '../../progress/progress.js';
import { loadMastery } from '../growth/service.js';

const LEVEL_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

const r = Router();

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

// GET /api/fields/:id/taster — the field's primary live taster (shortest first,
// so the 1h tasting wins over the full project). Full bundle with concepts +
// resources. Student-only.
r.get(
  '/fields/:id/taster',
  requireAuth,
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const field = await prisma.field.findUnique({ where: { id }, select: { id: true } });
      if (!field) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const taster = await prisma.tasterProject.findFirst({
        where: { fieldId: id, status: 'approved' },
        include: {
          concepts: { include: { concept: { select: { slug: true, name: true, level: true } } } },
          resources: {
            include: { resource: { select: { title: true, url: true } } },
            orderBy: { rank: 'asc' },
          },
        },
        orderBy: { estHours: 'asc' },
      });
      if (!taster) {
        res.status(404).json({ error: 'not_found', message: 'no live taster for this field yet' });
        return;
      }
      res.json({
        taster: {
          id: taster.id,
          slug: taster.slug,
          title: taster.title,
          description: taster.description,
          level: taster.level,
          estHours: taster.estHours,
          deliverableType: taster.deliverableType,
          rubric: taster.rubric,
          status: taster.status,
          concepts: taster.concepts.map((c) => c.concept),
          resources: taster.resources.map((x) => x.resource),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

const submitBody = z.object({
  submissionUrl: z.string().url().max(500).optional(),
  submissionText: z.string().max(20000).optional(),
  enjoyment: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  wouldContinue: z.boolean(),
  reflection: z.string().max(20000).optional(),
});

// GET /api/fields/:id/tasting — "a brief idea about that field": the 5 simplest
// concepts (level, then importance — computed live, never hardcoded) each with
// its top resource, all live tastings with rubrics, and the simplest starter
// projects ordered by (fewest required concepts, fewest hours) with this user's
// readiness. Student-only.
r.get(
  '/fields/:id/tasting',
  requireAuth,
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const field = await prisma.field.findUnique({
        where: { id },
        include: { concepts: { include: { concept: true } } },
      });
      if (!field) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const simplest = [...field.concepts]
        .sort(
          (a, b) =>
            (LEVEL_RANK[a.concept.level] ?? 9) - (LEVEL_RANK[b.concept.level] ?? 9) ||
            b.importance - a.importance ||
            (a.concept.slug < b.concept.slug ? -1 : 1),
        )
        .slice(0, 5);

      const [topResources, tastings, suggestions, mastery] = await Promise.all([
        prisma.conceptResource.findMany({
          where: { conceptId: { in: simplest.map((s) => s.conceptId) }, rank: 1 },
          include: { resource: { select: { title: true, url: true } } },
        }),
        prisma.tasterProject.findMany({
          where: { fieldId: id, status: 'approved' },
          include: {
            concepts: { include: { concept: { select: { slug: true, name: true } } } },
            resources: {
              include: { resource: { select: { title: true, url: true } } },
              orderBy: { rank: 'asc' },
            },
          },
          orderBy: { estHours: 'asc' },
        }),
        prisma.projectSuggestion.findMany({
          where: { fieldId: id, status: 'approved' },
          orderBy: [{ level: 'asc' }, { estHours: 'asc' }],
        }),
        loadMastery(userIdOf(req)),
      ]);
      const topByConcept = new Map(topResources.map((r) => [r.conceptId, r.resource]));

      res.json({
        field: { id: field.id, slug: field.slug, name: field.name, description: field.description },
        simplestConcepts: simplest.map((s) => ({
          conceptId: s.conceptId,
          slug: s.concept.slug,
          name: s.concept.name,
          level: s.concept.level,
          importance: s.importance,
          resource: topByConcept.get(s.conceptId) ?? null,
        })),
        tastings: tastings.map((t) => ({
          id: t.id,
          slug: t.slug,
          title: t.title,
          description: t.description,
          level: t.level,
          estHours: t.estHours,
          deliverableType: t.deliverableType,
          rubric: t.rubric,
          concepts: t.concepts.map((c) => c.concept),
          resources: t.resources.map((r) => r.resource),
        })),
        starterProjects: suggestions
          .map((s) => {
            const required = (s.requiredConcepts as unknown as string[]) ?? [];
            return {
              slug: s.slug,
              title: s.title,
              description: s.description,
              level: s.level,
              estHours: s.estHours,
              ...projectReadiness(required, mastery),
            };
          })
          .sort(
            (a, b) =>
              Number(b.ready) - Number(a.ready) ||
              a.total - b.total ||
              a.estHours - b.estHours ||
              (a.slug < b.slug ? -1 : 1),
          ),
      });
    } catch (e) {
      next(e);
    }
  },
);

r.post(
  '/users/me/tasters/:tasterId/start',
  requireAuth,
  validate({ params: tasterIdParam }),
  (_req: Request, res: Response) => {
    res.status(501).json({ error: 'not_implemented' });
  },
);

r.post(
  '/users/me/tasters/:tasterId/submit',
  requireAuth,
  validate({ params: tasterIdParam, body: submitBody }),
  (_req: Request, res: Response) => {
    res.status(501).json({ error: 'not_implemented' });
  },
);

export default r;
