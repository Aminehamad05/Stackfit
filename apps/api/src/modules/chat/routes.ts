import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { idParam } from '../../schemas/common.js';
import { getChatProvider, type ChatMessageInput } from '../../ai/provider.js';
import { retrieveSiteKnowledge } from '../../llm/site-knowledge.js';

const r = Router();

const threadBody = z.object({ title: z.string().min(1).max(100).optional() });
const messageBody = z.object({ content: z.string().min(1).max(4000) });
const HISTORY_LIMIT = 20;

// Mirrors apps/api/src/llm/prompts/chat_assistant.md (kept in code so the
// Docker image needs no .md file at runtime).
const SYSTEM_PROMPT = [
  "You are Stackfit's friendly study buddy for CS students and career switchers.",
  'The backend injects the student\'s live context before the conversation — use it, never ask for what you already know.',
  'Guide, don\'t lecture: short answers, one idea at a time, end with ONE follow-up.',
  'When the user wants to learn or get good at something: FIRST map it to one of site_fields and name the exact site destination — Roadmap page for ordered steps, Taster page for hands-on trial, My Fields to compare/switch, Quiz gates inside the roadmap. THEN give at most a 3-line primer. The site is the course; chat is the signpost, never the classroom.',
  'When they ask about their path, reference their actual progress from the context.',
  'If they paste quiz content asking for the answer, teach the idea; don\'t hand over the option.',
  'Stay on learning/career topics; redirect anything else in one sentence.',
  'Never claim to grade, unlock steps, or award certificates.',
  'For website questions, answer ONLY from SITE KNOWLEDGE below; for curriculum questions, ONLY from APPROVED CONCEPTS below.',
  'Never reveal other users, credentials, grades beyond this student\'s own progress, unapproved content, or anything outside the provided context — say what is missing and point to the right page instead of guessing.',
  'Keep replies under ~150 words unless they ask for depth.',
].join(' ');

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

function isBadRequest(e: unknown): boolean {
  return e instanceof Error && (e as { status?: number }).status === 400;
}

/** Approved-only curriculum grounding: top keyword-matching concepts. */
async function conceptBlock(query: string): Promise<string> {
  const terms = [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 3),
    ),
  ].slice(0, 6);
  if (terms.length === 0) return '';
  const concepts = await prisma.concept.findMany({
    where: {
      status: 'approved',
      OR: terms.flatMap((t) => [
        { name: { contains: t, mode: 'insensitive' as const } },
        { description: { contains: t, mode: 'insensitive' as const } },
      ]),
    },
    select: { name: true, level: true, description: true },
    take: 3,
  });
  if (concepts.length === 0) return '';
  return concepts.map((c) => `- ${c.name} (${c.level}): ${c.description.slice(0, 300)}`).join('\n');
}

async function ownThread(userId: number, id: number) {
  return prisma.chatThread.findFirst({ where: { id, userId } });
}

/** Live student context injected ahead of every assistant turn. */
async function buildContext(userId: number): Promise<string> {
  const [user, fields, matches, match, roadmaps, known, certs, tasters] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
    prisma.field.findMany({ select: { slug: true, name: true, description: true }, orderBy: { name: 'asc' } }),
    prisma.userFieldMatch.findMany({
      where: { userId },
      include: { field: { select: { slug: true, name: true } } },
      orderBy: { score: 'desc' },
      take: 3,
    }),
    prisma.userFieldMatch.findFirst({ where: { userId, chosen: true }, include: { field: true } }),
    prisma.roadmap.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: 1,
      include: {
        field: { select: { slug: true, name: true } },
        steps: {
          select: { status: true, position: true, concept: { select: { name: true } } },
          orderBy: { position: 'asc' },
        },
      },
    }),
    prisma.userKnownConcept.findMany({
      where: { userId },
      include: { concept: { select: { slug: true } } },
      orderBy: { strength: 'desc' },
      take: 8,
    }),
    prisma.userCertification.findMany({
      where: { userId },
      select: { certification: { select: { slug: true } } },
    }),
    prisma.userTaster.count({ where: { userId, status: { in: ['submitted', 'reviewed'] } } }),
  ]);
  const roadmap = roadmaps[0];
  const done = roadmap?.steps.filter((s) => s.status === 'quiz_passed' || s.status === 'interview_passed').length ?? 0;
  const nextSteps = (roadmap?.steps ?? [])
    .filter((s) => s.status === 'in_progress' || s.status === 'locked')
    .slice(0, 3)
    .map((s) => s.concept.name);
  return JSON.stringify({
    student_name: user?.displayName ?? null,
    site_fields: fields.map((f) => ({ slug: f.slug, name: f.name })),
    top_matches: matches.map((m) => ({ slug: m.field.slug, name: m.field.name, chosen: m.chosen })),
    chosen_field: match?.field.slug ?? null,
    roadmap: roadmap
      ? { field: roadmap.field.slug, steps_done: done, steps_total: roadmap.steps.length, next_steps: nextSteps }
      : null,
    known_concepts: known.map((k) => k.concept.slug),
    certifications: certs.map((c) => c.certification.slug),
    tasters_completed: tasters,
  });
}

// POST /api/chat/threads — start a thread.
r.post(
  '/chat/threads',
  requireAuth,
  validate({ body: threadBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title } = threadBody.parse(req.body);
      const thread = await prisma.chatThread.create({
        data: { userId: userIdOf(req), title: title ?? 'New chat' },
      });
      res.status(201).json({ thread });
    } catch (e) {
      next(e);
    }
  },
);

// GET /api/chat/threads — list mine, newest first.
r.get(
  '/chat/threads',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const threads = await prisma.chatThread.findMany({
        where: { userId: userIdOf(req) },
        select: { id: true, title: true, updatedAt: true, _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      res.json({ threads });
    } catch (e) {
      next(e);
    }
  },
);

// GET /api/chat/threads/:id/messages — history (owner only).
r.get(
  '/chat/threads/:id/messages',
  requireAuth,
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const thread = await ownThread(userIdOf(req), id);
      if (!thread) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const messages = await prisma.chatMessage.findMany({
        where: { threadId: id },
        select: { id: true, role: true, content: true, createdAt: true },
        orderBy: { id: 'asc' },
      });
      // BigInt ids don't JSON-serialize — project to Number (safe range here).
      res.json({
        messages: messages.map((m) => ({ id: Number(m.id), role: m.role, content: m.content, createdAt: m.createdAt })),
      });
    } catch (e) {
      next(e);
    }
  },
);

// POST /api/chat/threads/:id/messages — send; persists both sides, returns reply.
// Needs LLM_API_KEY, else 503 chat_disabled with setup guidance.
r.post(
  '/chat/threads/:id/messages',
  requireAuth,
  validate({ params: idParam, body: messageBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const { content } = messageBody.parse(req.body);
      const userId = userIdOf(req);
      const thread = await ownThread(userId, id);
      if (!thread) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const provider = getChatProvider(); // throws ChatDisabledError → 503
      await prisma.chatMessage.create({ data: { threadId: id, role: 'user', content } });
      const history = await prisma.chatMessage.findMany({
        where: { threadId: id },
        select: { role: true, content: true },
        orderBy: { id: 'desc' },
        take: HISTORY_LIMIT,
      });
      const turns: ChatMessageInput[] = history
        .reverse()
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const context = await buildContext(userId);
      // Today's date rides along so date questions ("what day is it?") are
      // answered from context — otherwise the model reaches for a date tool
      // it was never given (Groq 400: tool_choice none, model called a tool).
      const today = new Date().toISOString().slice(0, 10);
      // Site grounding (RAG-lite): static product knowledge by keyword +
      // approved-only concept rows. Nothing else is ever injected.
      const site = retrieveSiteKnowledge(content);
      const concepts = await conceptBlock(content);
      const grounded = [
        `SITE KNOWLEDGE (authoritative):\n${site || '(no section matched)'}`,
        `APPROVED CONCEPTS:\n${concepts || '(none matched)'}`,
      ].join('\n');
      const messages: ChatMessageInput[] = [
        { role: 'system', content: `${SYSTEM_PROMPT} Today's date is ${today}.\n${grounded}` },
        { role: 'user', content: `My live progress on CareerPath: ${context}` },
        ...turns,
      ];
      let reply: string;
      try {
        reply = await provider.chat(messages);
      } catch (e) {
        // One deterministic retry: the tool-call impulse is sampling noise
        // and temperature 0 almost always lands a clean plain-text reply.
        if (!isBadRequest(e)) throw e;
        reply = await provider.chat(messages, { temperature: 0 });
      }
      const saved = await prisma.chatMessage.create({
        data: { threadId: id, role: 'assistant', content: reply },
      });
      await prisma.chatThread.update({
        where: { id },
        data: {
          title: thread.title === 'New chat' ? content.slice(0, 40) : undefined,
          updatedAt: new Date(),
        },
      });
      res.status(201).json({ message: { id: Number(saved.id), role: saved.role, content: saved.content, createdAt: saved.createdAt } });
    } catch (e) {
      next(e);
    }
  },
);

// DELETE /api/chat/threads/:id — delete (messages cascade).
r.delete(
  '/chat/threads/:id',
  requireAuth,
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const thread = await ownThread(userIdOf(req), id);
      if (!thread) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      await prisma.chatThread.delete({ where: { id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

export default r;
