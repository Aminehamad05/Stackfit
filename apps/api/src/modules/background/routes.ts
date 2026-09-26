import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { knownAndLiked } from '../../matching/matching.js';

const r = Router();

const backgroundBody = z.object({
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        confidence: z.number().int().min(1).max(5),
        interest: z.number().int().min(1).max(5),
      }),
    )
    .min(1),
});

const itemsQuery = z.object({
  kind: z.enum(['uni_course', 'skill', 'experience']).optional(),
});

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

// GET /background-items[?kind=] — public catalogue for the onboarding picker.
// Every course/module ships its linked concepts WITH full details (name, level)
// so users can evaluate what each pick actually covers before rating it.
r.get(
  '/background-items',
  validate({ query: itemsQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { kind } = itemsQuery.parse(req.query);
      const items = await prisma.backgroundItem.findMany({
        where: kind ? { kind } : {},
        include: {
          concepts: {
            include: { concept: { select: { id: true, slug: true, name: true, level: true } } },
            orderBy: { strength: 'desc' },
          },
        },
        orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      });
      res.json({
        items: items.map((i) => ({
          id: i.id,
          kind: i.kind,
          name: i.name,
          concepts: i.concepts.map((c) => ({
            id: c.concept.id,
            slug: c.concept.slug,
            name: c.concept.name,
            level: c.concept.level,
            strength: c.strength,
          })),
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

// POST /users/me/background — replace-all save of the user's picks.
r.post(
  '/users/me/background',
  requireAuth,
  validate({ body: backgroundBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { items } = backgroundBody.parse(req.body);
      const ids = [...new Set(items.map((i) => i.itemId))];
      const existing = await prisma.backgroundItem.findMany({
        where: { id: { in: ids } },
        select: { id: true },
      });
      const unknown = ids.filter((id) => !existing.some((e) => e.id === id));
      if (unknown.length > 0) {
        res.status(400).json({ error: 'validation_error', details: [{ path: ['items'], message: `unknown itemIds: ${unknown.join(', ')}` }] });
        return;
      }
      const userId = userIdOf(req);
      await prisma.$transaction([
        prisma.userBackground.deleteMany({ where: { userId } }),
        prisma.userBackground.createMany({
          data: items.map((i) => ({
            userId,
            itemId: i.itemId,
            confidence: i.confidence,
            interest: i.interest,
          })),
        }),
      ]);
      res.status(201).json({
        background: items.map((i) => ({
          itemId: i.itemId,
          confidence: i.confidence,
          interest: i.interest,
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

// GET /users/me/background — read back saved picks (for the UI to pre-fill).
r.get(
  '/users/me/background',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await prisma.userBackground.findMany({
        where: { userId: userIdOf(req) },
        include: { item: { select: { id: true, kind: true, name: true } } },
        orderBy: { item: { name: 'asc' } },
      });
      res.json({
        background: rows.map((b) => ({
          itemId: b.itemId,
          kind: b.item.kind,
          name: b.item.name,
          confidence: b.confidence,
          interest: b.interest,
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

// GET /users/me/background/profile — the backend logic: turns saved picks into
// per-concept "known" (0–1) and "liked" (0–1) maps via matching.knownAndLiked.
// Powers the "here's what we inferred — adjust your ratings" evaluation screen
// and feeds field matching next.
r.get(
  '/users/me/background/profile',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = userIdOf(req);
      const [picks, mappings, concepts] = await Promise.all([
        prisma.userBackground.findMany({ where: { userId } }),
        prisma.backgroundItemConcept.findMany(),
        prisma.concept.findMany({ select: { id: true, slug: true, name: true, level: true } }),
      ]);
      if (picks.length === 0) {
        res.json({ known: [], liked: [], picks: 0 });
        return;
      }
      const itemConcepts = new Map<number, { conceptId: number; strength: number }[]>();
      for (const m of mappings) {
        const arr = itemConcepts.get(m.itemId) ?? [];
        arr.push({ conceptId: m.conceptId, strength: m.strength });
        itemConcepts.set(m.itemId, arr);
      }
      const { known, liked } = knownAndLiked(
        picks.map((p) => ({ itemId: p.itemId, confidence: p.confidence, interest: p.interest })),
        itemConcepts,
      );
      const meta = new Map(concepts.map((c) => [c.id, c]));
      const ranked = (map: Map<number, number>) =>
        [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([id, score]) => ({
            conceptId: id,
            slug: meta.get(id)?.slug ?? String(id),
            name: meta.get(id)?.name ?? String(id),
            level: meta.get(id)?.level ?? 'beginner',
            score: Math.round(score * 100) / 100,
          }));
      res.json({ picks: picks.length, known: ranked(known), liked: ranked(liked) });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
