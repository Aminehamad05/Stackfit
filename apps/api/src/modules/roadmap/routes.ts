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

// GET /api/roadmaps — list mine (newest first) with step counts.
r.get(
  '/roadmaps',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await prisma.roadmap.findMany({
        where: { userId: userIdOf(req) },
        include: {
          field: { select: { slug: true, name: true } },
          _count: { select: { steps: true } },
        },
        orderBy: { id: 'desc' },
      });
      res.json({
        roadmaps: rows.map((m) => ({
          id: m.id,
          field: m.field,
          steps: m._count.steps,
          includePaid: m.includePaid,
          createdAt: m.createdAt,
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);
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

export type PathNodeState = 'locked' | 'current' | 'completed' | 'skip_eligible';

// GET /api/roadmaps/:id/path — visual skill-tree nodes (owner only).
// Node kinds are DERIVED from real relations (no step_type column yet, Step 4
// pending — see apps/web/task.md mapping): course ← roadmap_steps row,
// quiz ← live questions + pass state, project ← taster_projects via
// taster_concepts, cert ← certifications whose criteria.required_concepts
// include the step's concept. skip_eligible is never emitted (no source data).
r.get(
  '/roadmaps/:id/path',
  requireAuth,
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const userId = userIdOf(req);
      const roadmap = await prisma.roadmap.findFirst({
        where: { id, userId },
        include: { field: { select: { slug: true, name: true } } },
      });
      if (!roadmap) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const [steps, attempts, tasterLinks, userTasters, certs, earned, qCounts] = await Promise.all([
        prisma.roadmapStep.findMany({
          where: { roadmapId: id },
          include: { concept: true, resource: true },
          orderBy: { position: 'asc' },
        }),
        prisma.quizAttempt.findMany({
          where: { userId, passed: true },
          select: { conceptId: true },
        }),
        prisma.tasterConcept.findMany({
          include: { taster: { select: { id: true, slug: true, title: true, level: true, estHours: true, status: true } } },
        }),
        prisma.userTaster.findMany({ where: { userId }, select: { tasterId: true, status: true } }),
        prisma.certification.findMany({
          where: { status: 'approved' },
          select: { slug: true, title: true, criteria: true },
        }),
        prisma.userCertification.findMany({ where: { userId }, select: { certification: { select: { slug: true } } } }),
        prisma.question.groupBy({ by: ['conceptId'], where: { status: 'approved' }, _count: { id: true } }),
      ]);
      const passedConcepts = new Set(attempts.map((a) => a.conceptId));
      const tasterStatus = new Map(userTasters.map((t) => [t.tasterId, t.status]));
      const earnedSlugs = new Set(earned.map((e) => e.certification.slug));
      const quizCount = new Map(qCounts.map((q) => [q.conceptId, q._count.id]));
      const tastersByConcept = new Map<number, typeof tasterLinks>();
      for (const l of tasterLinks) {
        if (l.taster.status !== 'approved') continue;
        const arr = tastersByConcept.get(l.conceptId) ?? [];
        arr.push(l);
        tastersByConcept.set(l.conceptId, arr);
      }

      const nodes: Array<Record<string, unknown>> = [];
      let currentKey: string | null = null;
      const markCurrent = (key: string): void => {
        if (currentKey === null) currentKey = key;
      };

      for (const s of steps) {
        const stepDone = s.status === 'quiz_passed' || s.status === 'interview_passed';
        const courseState: PathNodeState = s.status === 'locked' ? 'locked' : stepDone ? 'completed' : 'current';
        nodes.push({
          key: `step-${s.position}-course`,
          kind: 'course',
          position: s.position,
          state: courseState,
          concept: { id: s.concept.id, slug: s.concept.slug, name: s.concept.name, level: s.concept.level },
          resource: s.resource
            ? { id: s.resource.id, title: s.resource.title, url: s.resource.url, isFree: s.resource.isFree }
            : null,
        });
        if (courseState === 'current') markCurrent(`step-${s.position}-course`);

        const quizPassed = stepDone || passedConcepts.has(s.conceptId);
        const quizState: PathNodeState = s.status === 'locked' ? 'locked' : quizPassed ? 'completed' : 'current';
        nodes.push({
          key: `step-${s.position}-quiz`,
          kind: 'quiz',
          position: s.position,
          state: quizState,
          concept: { id: s.concept.id, slug: s.concept.slug, name: s.concept.name },
          questionCount: quizCount.get(s.conceptId) ?? 0,
          passThreshold: 0.7,
        });
        if (quizState === 'current') markCurrent(`step-${s.position}-quiz`);

        for (const l of tastersByConcept.get(s.conceptId) ?? []) {
          const st = tasterStatus.get(l.tasterId);
          const pState: PathNodeState =
            st === 'reviewed' ? 'completed' : s.status === 'locked' ? 'locked' : 'current';
          nodes.push({
            key: `step-${s.position}-project-${l.tasterId}`,
            kind: 'project',
            position: s.position,
            state: pState,
            locking: true,
            taster: { id: l.taster.id, slug: l.taster.slug, title: l.taster.title, level: l.taster.level, estHours: l.taster.estHours },
            userStatus: st ?? null,
          });
          if (pState === 'current') markCurrent(`step-${s.position}-project-${l.tasterId}`);
        }

        for (const c of certs) {
          const required = ((c.criteria as unknown as { required_concepts?: string[] })?.required_concepts) ?? [];
          if (!required.includes(s.concept.slug)) continue;
          const isEarned = earnedSlugs.has(c.slug);
          nodes.push({
            key: `step-${s.position}-cert-${c.slug}`,
            kind: 'cert',
            position: s.position,
            state: isEarned ? 'completed' : s.status === 'locked' ? 'locked' : 'current',
            locking: false,
            cert: { slug: c.slug, title: c.title },
          });
        }
      }

      res.json({ roadmap: { id: roadmap.id, field: roadmap.field }, nodes, currentKey });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
