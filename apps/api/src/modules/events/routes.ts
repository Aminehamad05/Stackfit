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
  // Superseded by POST /clubs/register (organisation signup with password).
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/clubs/:id/events', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post('/clubs/:id/events', validate({ params: idParam, body: eventBody }), (_req, res) => {
  res.status(501).json({ error: 'not_implemented' });
});

// ---- Networking (Step 3): public approved-event reads, no auth required ----

const eventPublicSelect = {
  id: true,
  title: true,
  type: true,
  city: true,
  country: true,
  location: true,
  description: true,
  startsAt: true,
  endsAt: true,
  url: true,
  club: { select: { id: true, name: true } },
  field: { select: { id: true, slug: true, name: true } },
} as const;

// GET /api/events?field=&city=&from= — approved only, soonest first.
r.get(
  '/events',
  validate({ query: eventsQuery }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = eventsQuery.parse(req.query);
      const events = await prisma.event.findMany({
        where: {
          status: 'approved',
          ...(q.city ? { city: { contains: q.city, mode: 'insensitive' } } : {}),
          ...(q.field ? { field: { slug: q.field } } : {}),
          ...(q.from ? { startsAt: { gte: new Date(q.from) } } : {}),
        },
        select: eventPublicSelect,
        orderBy: { startsAt: 'asc' },
        take: q.limit,
        skip: q.offset,
      });
      res.json({ events });
    } catch (e) {
      next(e);
    }
  },
);

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// GET /api/events/:id/ics — .ics download for "Add to calendar".
r.get(
  '/events/:id/ics',
  validate({ params: idParam }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const event = await prisma.event.findFirst({
        where: { id, status: 'approved' },
        include: { club: true },
      });
      if (!event) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CareerPath//Events//EN',
        'BEGIN:VEVENT',
        `UID:event-${event.id}@careerpath`,
        `DTSTAMP:${icsDate(new Date())}`,
        `DTSTART:${icsDate(event.startsAt)}`,
        ...(event.endsAt ? [`DTEND:${icsDate(event.endsAt)}`] : []),
        `SUMMARY:${icsEscape(event.title)}`,
        ...(event.location || event.city ? [`LOCATION:${icsEscape([event.location, event.city].filter(Boolean).join(', '))}`] : []),
        ...(event.description ? [`DESCRIPTION:${icsEscape(event.description)}`] : []),
        ...(event.url ? [`URL:${event.url}`] : []),
        'END:VEVENT',
        'END:VCALENDAR',
      ];
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="event-${event.id}.ics"`);
      res.send(lines.join('\r\n'));
    } catch (e) {
      next(e);
    }
  },
);

// GET /api/events/:id/gcal-link — Google Calendar template URL (no OAuth).
r.get(
  '/events/:id/gcal-link',
  validate({ params: idParam }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const event = await prisma.event.findFirst({ where: { id, status: 'approved' } });
      if (!event) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const dates = event.endsAt
        ? `${icsDate(event.startsAt)}/${icsDate(event.endsAt)}`
        : `${icsDate(event.startsAt)}/${icsDate(event.startsAt)}`;
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates,
        ...(event.description ? { details: event.description } : {}),
        ...([event.location, event.city].filter(Boolean).length > 0
          ? { location: [event.location, event.city].filter(Boolean).join(', ') as string }
          : {}),
      });
      res.json({ url: `https://calendar.google.com/calendar/render?${params.toString()}` });
    } catch (e) {
      next(e);
    }
  },
);

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
