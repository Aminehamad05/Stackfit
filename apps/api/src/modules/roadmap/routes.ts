import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';
import { idParam } from '../../schemas/common.js';
import { buildRoadmap, knownAndLiked } from '../../matching/matching.js';

const r = Router();

const generateBody = z.object({
  fieldId: z.number().int().positive(),
  includePaid: z.boolean().optional(),
});

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

interface StepView {
  position: number;
  concept: { id: number; slug: string; name: string; level: string };
  resource: { id: number; title: string; url: string; isFree: boolean } | null;
  status: string;
}

async function stepsView(roadmapId: number): Promise<StepView[]> {
  const steps = await prisma.roadmapStep.findMany({
    where: { roadmapId },
    include: { concept: true, resource: true },
    orderBy: { position: 'asc' },
  });
  return steps.map((s) => ({
    position: s.position,
    concept: { id: s.concept.id, slug: s.concept.slug, name: s.concept.name, level: s.concept.level },
    resource: s.resource
      ? { id: s.resource.id, title: s.resource.title, url: s.resource.url, isFree: s.resource.isFree }
      : null,
    status: s.status,
  }));
}

// POST /api/roadmaps — generate: known (background + proven concepts) →
// buildRoadmap → persist steps with rank-1 resources (free unless opted in).
// Deterministic, no AI. Re-running creates a fresh roadmap (history kept).
r.post(
  '/roadmaps',
  requireAuth,
  validate({ body: generateBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fieldId, includePaid } = generateBody.parse(req.body);
      const userId = userIdOf(req);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: { concepts: true },
      });
      if (!field) {
        res.status(404).json({ error: 'not_found', message: 'unknown fieldId' });
        return;
      }

      // Known = background inference overlaid with proven concepts (max wins).
      const [picks, mappings, proven, concepts, prereqRows] = await Promise.all([
        prisma.userBackground.findMany({ where: { userId } }),
        prisma.backgroundItemConcept.findMany(),
        prisma.userKnownConcept.findMany({ where: { userId } }),
        prisma.concept.findMany(),
        prisma.conceptPrerequisite.findMany(),
      ]);
      const itemConcepts = new Map<number, { conceptId: number; strength: number }[]>();
      for (const m of mappings) {
        const arr = itemConcepts.get(m.itemId) ?? [];
        arr.push({ conceptId: m.conceptId, strength: m.strength });
        itemConcepts.set(m.itemId, arr);
      }
      const { known } = knownAndLiked(
        picks.map((p) => ({ itemId: p.itemId, confidence: p.confidence, interest: p.interest })),
        itemConcepts,
      );
      for (const k of proven) known.set(k.conceptId, Math.max(known.get(k.conceptId) ?? 0, k.strength));

      const conceptMap = new Map(
        concepts.map((c) => [c.id, { id: c.id, slug: c.slug, level: c.level as 'beginner' | 'intermediate' | 'advanced' }]),
      );
      const prereqs = new Map<number, number[]>();
      for (const p of prereqRows) {
        const arr = prereqs.get(p.conceptId) ?? [];
        arr.push(p.prereqId);
        prereqs.set(p.conceptId, arr);
      }
      const order = buildRoadmap(
        { id: field.id, slug: field.slug, concepts: field.concepts.map((c) => ({ conceptId: c.conceptId, importance: c.importance })) },
        conceptMap,
        prereqs,
        known,
      );

      // Rank-1 resource per step; paid only if opted in (or user has budget).
      const allowPaid = (includePaid ?? false) || user.budgetCents > 0;
      const links = await prisma.conceptResource.findMany({
        where: { conceptId: { in: order.map((s) => s.conceptId) } },
        include: { resource: true },
        orderBy: { rank: 'asc' },
      });
      const bestResource = new Map<number, number>();
      for (const l of links) {
        if (bestResource.has(l.conceptId)) continue;
        if (!l.resource.isFree && !allowPaid) continue;
        if (l.resource.status !== 'approved') continue;
        bestResource.set(l.conceptId, l.resourceId);
      }
      // Fallback: free approved resource even if rank-1 was paid.
      const freeFallback = new Map<number, number>();
      for (const l of links) {
        if (bestResource.has(l.conceptId) || freeFallback.has(l.conceptId)) continue;
        if (l.resource.isFree && l.resource.status === 'approved') freeFallback.set(l.conceptId, l.resourceId);
      }

      const roadmap = await prisma.roadmap.create({
        data: { userId, fieldId, includePaid: includePaid ?? false },
      });
      await prisma.roadmapStep.createMany({
        data: order.map((s) => ({
          roadmapId: roadmap.id,
          position: s.position,
          conceptId: s.conceptId,
          resourceId: bestResource.get(s.conceptId) ?? freeFallback.get(s.conceptId) ?? null,
          status: s.position === 1 ? 'in_progress' : 'locked',
        })),
      });

      res.status(201).json({
        roadmap: { id: roadmap.id, field: { slug: field.slug, name: field.name } },
        knownConcepts: [...known.entries()]
          .filter(([, v]) => v >= 0.5)
          .map(([id]) => conceptMap.get(id)?.slug ?? String(id)),
        steps: await stepsView(roadmap.id),
      });
    } catch (e) {
      next(e);
    }
  },
);

// GET /api/roadmaps/:id — read back (owner only), names included, no bare ids.
r.get(
  '/roadmaps/:id',
  requireAuth,
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const roadmap = await prisma.roadmap.findFirst({
        where: { id, userId: userIdOf(req) },
        include: { field: { select: { slug: true, name: true } } },
      });
      if (!roadmap) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json({
        roadmap: { id: roadmap.id, field: roadmap.field, includePaid: roadmap.includePaid },
        steps: await stepsView(roadmap.id),
      });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
