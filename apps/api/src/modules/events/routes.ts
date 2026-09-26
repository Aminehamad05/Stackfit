import { Router, type NextFunction, type Request, type Response } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { idParam, paginationQuery } from '../../schemas/common.js';
import { clubBody, eventBody, eventsQuery } from './schemas.js';

const r = Router();

// AGENT_SPEC §6 — events + club portal (public reads + user subscriptions).
// Club-owned write endpoints live in modules/clubs (club JWT required).

r.get('/clubs', validate({ query: paginationQuery }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post('/clubs', validate({ body: clubBody }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/clubs/:id/events', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post('/clubs/:id/events', validate({ params: idParam, body: eventBody }), (_req, res) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/events', validate({ query: eventsQuery }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/events/:id/ics', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/events/:id/gcal-link', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

// ---- Normal-user subscriptions (user JWT; approved events only) ----

function userIdOf(req: AuthenticatedRequest): number {
  const id = req.user?.sub;
  if (!id) throw Object.assign(new Error('missing user identity'), { status: 401 });
  return id;
}

// POST /api/events/:id/subscribe — idempotent (re-subscribing is a no-op 200).
r.post(
  '/events/:id/subscribe',
  requireAuth,
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const event = await prisma.event.findFirst({ where: { id, status: 'approved' } });
      if (!event) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      await prisma.userEvent.upsert({
        where: { userId_eventId: { userId: userIdOf(req), eventId: id } },
        update: {},
        create: { userId: userIdOf(req), eventId: id },
      });
      res.json({ subscribed: true, eventId: id });
    } catch (e) {
      next(e);
    }
  },
);

// DELETE /api/events/:id/subscribe — idempotent unsubscribe (204 either way).
r.delete(
  '/events/:id/subscribe',
  requireAuth,
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      await prisma.userEvent.deleteMany({ where: { userId: userIdOf(req), eventId: id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

// GET /api/users/me/events — the user's subscribed (approved) events, soonest first.
r.get(
  '/users/me/events',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rows = await prisma.userEvent.findMany({
        where: { userId: userIdOf(req), event: { status: 'approved' } },
        include: { event: { include: { club: { select: { id: true, name: true } } } } },
        orderBy: { event: { startsAt: 'asc' } },
      });
      res.json({ events: rows.map((s) => s.event) });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
