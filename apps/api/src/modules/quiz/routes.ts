import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';
import { idParam } from '../../schemas/common.js';
import { evaluateAndAward } from '../growth/service.js';

const r = Router();

const attemptBody = z.object({
  answers: z.array(z.object({ questionId: z.number().int().positive(), optionId: z.number().int().positive() })).min(1).max(20),
});

const quizQuery = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

// Quiz pass mark + reward (deterministic, code-owned — no per-quiz threshold column yet).
const PASS_THRESHOLD = 0.7;
const QUIZ_PASS_POINTS = 10;

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

// GET /api/concepts/:id/quiz?limit=5 — serve from live_questions ONLY.
// Correct answers are NEVER sent (options carry id+text only).
r.get(
  '/concepts/:id/quiz',
  requireAuth,
  validate({ params: idParam, query: quizQuery }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const { limit } = quizQuery.parse(req.query);
      const concept = await prisma.concept.findUnique({ where: { id }, select: { id: true, slug: true, name: true } });
      if (!concept) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const questions = await prisma.question.findMany({
        where: { conceptId: id, status: 'approved' },
        select: {
          id: true, stem: true, difficulty: true,
          options: { select: { id: true, text: true }, orderBy: { id: 'asc' } },
        },
        orderBy: { id: 'asc' },
        take: limit,
      });
      res.json({ concept, passThreshold: PASS_THRESHOLD, questions });
    } catch (e) {
      next(e);
    }
  },
);

// POST /api/concepts/:id/quiz/attempt — grade in code, unlock on pass:
// quiz_attempts row → step quiz_passed → next step in_progress → known concept
// → quiz points → certification check. All deterministic.
r.post(
  '/concepts/:id/quiz/attempt',
  requireAuth,
  validate({ params: idParam, body: attemptBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: conceptId } = idParam.parse(req.params);
      const { answers } = attemptBody.parse(req.body);
      const userId = userIdOf(req);

      const concept = await prisma.concept.findUnique({ where: { id: conceptId }, select: { id: true } });
      if (!concept) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const questionIds = [...new Set(answers.map((a) => a.questionId))];
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds }, conceptId, status: 'approved' },
        select: { id: true, options: { select: { id: true, isCorrect: true } } },
      });
      if (questions.length !== questionIds.length) {
        res.status(400).json({ error: 'validation_error', details: [{ path: ['answers'], message: 'unknown or foreign questionId, or question not approved' }] });
        return;
      }
      const correctByQ = new Map(questions.map((q) => [q.id, new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id))]));
      let correct = 0;
      for (const a of answers) {
        if (correctByQ.get(a.questionId)?.has(a.optionId)) correct += 1;
      }
      const score = Math.round((correct / answers.length) * 100) / 100;
      const passed = score >= PASS_THRESHOLD;

      const attempt = await prisma.quizAttempt.create({
        data: { userId, conceptId, answers: answers as unknown as object, score, passed },
      });

      let unlocked: { roadmapId: number; stepPosition: number } | null = null;
      let newlyAwarded: string[] = [];
      if (passed) {
        // Flip every matching in_progress step (across the user's roadmaps) + open next.
        const steps = await prisma.roadmapStep.findMany({
          where: { roadmap: { userId }, conceptId, status: 'in_progress' },
          select: { roadmapId: true, position: true },
        });
        for (const s of steps) {
          await prisma.roadmapStep.update({
            where: { roadmapId_position: { roadmapId: s.roadmapId, position: s.position } },
            data: { status: 'quiz_passed' },
          });
          const next = await prisma.roadmapStep.findFirst({
            where: { roadmapId: s.roadmapId, position: s.position + 1, status: 'locked' },
          });
          if (next) {
            await prisma.roadmapStep.update({
              where: { roadmapId_position: { roadmapId: next.roadmapId, position: next.position } },
              data: { status: 'in_progress' },
            });
            unlocked ??= { roadmapId: next.roadmapId, stepPosition: next.position };
          }
        }
        await prisma.userKnownConcept.upsert({
          where: { userId_conceptId_source: { userId, conceptId, source: 'quiz' } },
          update: { strength: Math.max(score, 0) },
          create: { userId, conceptId, source: 'quiz', strength: score },
        });
        // Best-effort ledger (unique ref blocks double-counting on regrade).
        await prisma.pointEvent.upsert({
          where: { userId_type_refId: { userId, type: 'quiz', refId: `quiz:${attempt.id}` } },
          update: {},
          create: { userId, type: 'quiz', points: QUIZ_PASS_POINTS, refId: `quiz:${attempt.id}` },
        });
        ({ awarded: newlyAwarded } = await evaluateAndAward(userId));
      }

      res.status(201).json({
        attemptId: attempt.id,
        score,
        passed,
        passThreshold: PASS_THRESHOLD,
        correct,
        total: answers.length,
        unlocked,
        newlyAwarded,
      });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
