import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { fitScore, knownAndLiked, rankFields } from '../../matching/matching.js';

const r = Router();

const fieldChoiceBody = z.object({
  fieldId: z.number().int().positive(),
  includePaid: z.boolean().optional(),
});

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

const pct = (x: number): number => Math.round(x * 100);

interface FitRow {
  user_id: number;
  field_id: number;
  tasters_done: bigint | number;
  avg_enjoyment: number | string | null;
  avg_performance: number | string | null;
}

// AGENT_SPEC §4 + §6 — pure deterministic matching (matching.ts). The LLM only
// ever writes the "why this fits" text, and that path is disabled (see ai/).

// POST /users/me/field-matches/compute — score all fields from saved background,
// persist, return top-3 with compatibility percentages (best = 100%).
r.post(
  '/users/me/field-matches/compute',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = userIdOf(req);
      const picks = await prisma.userBackground.findMany({ where: { userId } });
      if (picks.length === 0) {
        res.status(400).json({ error: 'validation_error', details: [{ path: ['background'], message: 'save background first (POST /users/me/background)' }] });
        return;
      }
      const [mappings, dbFields] = await Promise.all([
        prisma.backgroundItemConcept.findMany(),
        prisma.field.findMany({ include: { concepts: true } }),
      ]);
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
      const fields = dbFields.map((f) => ({
        id: f.id,
        slug: f.slug,
        concepts: f.concepts.map((c) => ({ conceptId: c.conceptId, importance: c.importance })),
      }));
      const ranked = rankFields(fields, known, liked, 3);

      await prisma.$transaction([
        prisma.userFieldMatch.deleteMany({ where: { userId } }),
        prisma.userFieldMatch.createMany({
          data: ranked.map((m) => ({ userId, fieldId: m.fieldId, score: m.score })),
        }),
      ]);

      const meta = new Map(dbFields.map((f) => [f.id, f]));
      const conceptMeta = new Map(
        (await prisma.concept.findMany({ select: { id: true, slug: true, name: true } })).map((c) => [c.id, c]),
      );
      res.json({
        matches: ranked.map((m) => ({
          fieldId: m.fieldId,
          slug: m.slug,
          name: meta.get(m.fieldId)?.name ?? m.slug,
          description: meta.get(m.fieldId)?.description ?? '',
          compatibility: pct(m.relativeScore),
          skillMatch: pct(m.skillMatch),
          interestMatch: pct(m.interestMatch),
          matchedConcepts: m.matchedConcepts.map((id) => ({
            conceptId: id,
            slug: conceptMeta.get(id)?.slug ?? String(id),
            name: conceptMeta.get(id)?.name ?? String(id),
          })),
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

// GET /users/me/field-matches — saved top-3 (404 until compute runs).
r.get(
  '/users/me/field-matches',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await prisma.userFieldMatch.findMany({
        where: { userId: userIdOf(req) },
        include: { field: true },
        orderBy: { score: 'desc' },
      });
      if (rows.length === 0) {
        res.status(404).json({ error: 'not_computed', message: 'run POST /users/me/field-matches/compute first' });
        return;
      }
      const best = rows[0].score || 1;
      res.json({
        matches: rows.map((m) => ({
          fieldId: m.fieldId,
          slug: m.field.slug,
          name: m.field.name,
          description: m.field.description,
          compatibility: pct(m.score / best),
          chosen: m.chosen,
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

// GET /users/me/field-fit — fitScore() per candidate field from field_fit_inputs.
// Untried fields return fit:null ("not tried yet") — never ranked against tried ones.
r.get(
  '/users/me/field-fit',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = userIdOf(req);
      const rows = await prisma.userFieldMatch.findMany({
        where: { userId },
        include: { field: true },
        orderBy: { score: 'desc' },
      });
      if (rows.length === 0) {
        res.status(404).json({ error: 'not_computed', message: 'run POST /users/me/field-matches/compute first' });
        return;
      }
      const best = rows[0].score || 1;
      const inputs = (await prisma.$queryRawUnsafe(
        'SELECT * FROM field_fit_inputs WHERE user_id = $1',
        userId,
      )) as FitRow[];
      const byField = new Map(inputs.map((i) => [Number(i.field_id), i]));
      res.json({
        fit: rows.map((m) => {
          const row = byField.get(m.fieldId);
          const result = fitScore(
            m.score / best,
            row
              ? {
                  tasters_done: Number(row.tasters_done),
                  avg_enjoyment: Number(row.avg_enjoyment),
                  avg_performance: Number(row.avg_performance),
                }
              : null,
          );
          return {
            fieldId: m.fieldId,
            slug: m.field.slug,
            compatibility: pct(m.score / best),
            ...result,
            fit: result.fit === null ? null : Math.round(result.fit * 100) / 100,
          };
        }),
      });
    } catch (e) {
      next(e);
    }
  },
);

// POST /users/me/field-choice — final pick: creates the roadmap shell + marks chosen.
r.post(
  '/users/me/field-choice',
  requireAuth,
  validate({ body: fieldChoiceBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fieldId, includePaid } = fieldChoiceBody.parse(req.body);
      const userId = userIdOf(req);
      const field = await prisma.field.findUnique({ where: { id: fieldId } });
      if (!field) {
        res.status(404).json({ error: 'not_found', message: 'unknown fieldId' });
        return;
      }
      const [roadmap] = await prisma.$transaction([
        prisma.roadmap.create({ data: { userId, fieldId, includePaid: includePaid ?? false } }),
        prisma.userFieldMatch.updateMany({ where: { userId }, data: { chosen: false } }),
        prisma.userFieldMatch.updateMany({ where: { userId, fieldId }, data: { chosen: true } }),
      ]);
      res.status(201).json({
        roadmap: { id: roadmap.id, fieldId, slug: field.slug, includePaid: roadmap.includePaid },
      });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
