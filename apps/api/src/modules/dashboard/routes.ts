import { Router, type NextFunction, type Response } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';

const r = Router();

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

interface LeaderboardRow {
  id: number;
  total_points: number | string;
}

// GET /api/users/me/dashboard — phase-aware KPIs per product-decisions.md
// (confirmed by user, 2026-09-27). Tasting = no chosen match: one KPI block
// per tasted domain. Committed = chosen set: exactly one block for that field.
r.get(
  '/users/me/dashboard',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = userIdOf(req);
      const matches = await prisma.userFieldMatch.findMany({
        where: { userId },
        include: { field: { select: { id: true, slug: true, name: true } } },
        orderBy: { score: 'desc' },
      });
      const chosen = matches.find((m) => m.chosen) ?? null;

      if (!chosen) {
        // ---- Tasting phase: every tasted domain gets its own block ----
        const tasterRows = await prisma.userTaster.findMany({
          where: { userId },
          include: { taster: { select: { fieldId: true, field: { select: { slug: true, name: true } } } } },
        });
        const fieldIds = new Set<number>([
          ...matches.map((m) => m.fieldId),
          ...tasterRows.map((t) => t.taster.fieldId),
        ]);
        const blocks = [];
        for (const fieldId of fieldIds) {
          const [liveTasters, field] = await Promise.all([
            prisma.tasterProject.findMany({ where: { fieldId, status: 'approved' }, select: { id: true } }),
            prisma.field.findUniqueOrThrow({ where: { id: fieldId }, select: { slug: true, name: true } }),
          ]);
          const liveIds = new Set(liveTasters.map((t) => t.id));
          const mine = tasterRows.filter((t) => t.taster.fieldId === fieldId && liveIds.has(t.tasterId));
          const reviewed = mine.filter((t) => t.status === 'reviewed');
          const enjoyments = mine.map((t) => t.enjoyment).filter((e): e is number => e !== null);
          const performances = mine.map((t) => t.performance).filter((p): p is number => p !== null);
          const avg = (xs: number[]): number | null =>
            xs.length > 0 ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null;
          const quizzesPassed = await prisma.quizAttempt.count({
            where: {
              userId,
              passed: true,
              concept: { fields: { some: { fieldId } } },
            },
          });
          blocks.push({
            field: { slug: field.slug, name: field.name },
            tasters: { done: reviewed.length, total: liveTasters.length },
            enjoyment: avg(enjoyments),
            performance: avg(performances),
            quizzesPassed,
          });
        }
        res.json({ phase: 'tasting', committedField: null, taste: blocks, committed: null });
        return;
      }

      // ---- Committed phase: exactly one block, for the chosen field ----
      const fieldId = chosen.fieldId;
      const roadmaps = await prisma.roadmap.findMany({
        where: { userId, fieldId },
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      const roadmapId = roadmaps[0]?.id ?? null;
      const steps = roadmapId
        ? await prisma.roadmapStep.findMany({ where: { roadmapId }, select: { status: true } })
        : [];
      const done = steps.filter((s) => s.status === 'quiz_passed' || s.status === 'interview_passed').length;
      const [quizzesPassed, tasterAgg, certs, board] = await Promise.all([
        prisma.quizAttempt.count({ where: { userId, passed: true } }),
        prisma.userTaster.findMany({
          where: { userId, taster: { fieldId } },
          select: { status: true },
        }),
        prisma.userCertification.findMany({
          where: { userId, certification: { fieldId } },
          select: { awardedAt: true, certification: { select: { slug: true, title: true } } },
        }),
        prisma.$queryRawUnsafe('SELECT id, total_points FROM leaderboard') as Promise<LeaderboardRow[]>,
      ]);
      const liveTasterCount = await prisma.tasterProject.count({ where: { fieldId, status: 'approved' } });
      const rankIdx = board.findIndex((b) => Number(b.id) === userId);
      res.json({
        phase: 'committed',
        committedField: { slug: chosen.field.slug, name: chosen.field.name },
        taste: [],
        committed: {
          field: { slug: chosen.field.slug, name: chosen.field.name },
          roadmapId,
          completionPct: steps.length > 0 ? Math.round((done / steps.length) * 100) : 0,
          milestones: { done, total: steps.length },
          quizzesPassed,
          projects: {
            done: tasterAgg.filter((t) => t.status === 'reviewed').length,
            total: liveTasterCount,
          },
          certsEarned: certs.map((c) => ({
            slug: c.certification.slug,
            title: c.certification.title,
            awardedAt: c.awardedAt,
          })),
          points: rankIdx >= 0 ? Number(board[rankIdx].total_points) : 0,
          rank: rankIdx >= 0 ? rankIdx + 1 : null,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
