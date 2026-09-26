import { Router, type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { requireClub, signClubToken, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { emailSchema } from '../../schemas/common.js';
import { idParam } from '../../schemas/common.js';
import { clubLoginSchema, eventBody, eventUpdateSchema } from '../events/schemas.js';

const r = Router();

const clubRegisterSchema = z.object({
  name: z.string().min(1).max(200),
  email: emailSchema,
  password: z.string().min(8).max(128),
  description: z.string().max(5000).optional(),
  contactEmail: z.string().email().max(255).optional(),
});

// POST /api/clubs/register — organisation signup ("I represent a club").
// Trust/verification that the account genuinely represents the club is
// explicitly out of scope (phase-2); anyone can claim a name for the demo.
r.post(
  '/clubs/register',
  validate({ body: clubRegisterSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const b = clubRegisterSchema.parse(req.body);
      const clash = await prisma.club.findFirst({
        where: { OR: [{ email: b.email }, { name: b.name }] },
        select: { id: true },
      });
      if (clash) {
        res.status(409).json({ error: 'conflict', message: 'club name or email already registered' });
        return;
      }
      const club = await prisma.club.create({
        data: {
          name: b.name,
          email: b.email,
          passwordHash: await bcrypt.hash(b.password, 10),
          description: b.description,
          contactEmail: b.contactEmail,
        },
      });
      res.status(201).json({
        token: signClubToken(club),
        club: { id: club.id, name: club.name, email: club.email },
      });
    } catch (e) {
      next(e);
    }
  },
);

// POST /api/clubs/login — organisation login (club email + password) → club JWT.
// Demo credentials for seeded clubs: info@<name>.com / club2000 (see migration 0001).
r.post(
  '/clubs/login',
  validate({ body: clubLoginSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = clubLoginSchema.parse(req.body);
      const club = await prisma.club.findUnique({ where: { email } });
      if (!club || !(await bcrypt.compare(password, club.passwordHash))) {
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }
      res.json({
        token: signClubToken(club),
        club: { id: club.id, name: club.name, email: club.email },
      });
    } catch (e) {
      next(e);
    }
  },
);

// All routes below are club-only (requireClub rejects user tokens too).
r.use('/clubs/me', requireClub);

function clubIdOf(req: AuthenticatedRequest): number {
  const id = req.club?.clubId;
  if (!id) throw Object.assign(new Error('missing club identity'), { status: 401 });
  return id;
}

// GET /api/clubs/me/events — the club's own events, drafts included.
r.get('/clubs/me/events', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const events = await prisma.event.findMany({
      where: { clubId: clubIdOf(req) },
      orderBy: { startsAt: 'asc' },
    });
    res.json({ events });
  } catch (e) {
    next(e);
  }
});

// POST /api/clubs/me/events — create (default status draft; club may publish as approved).
r.post(
  '/clubs/me/events',
  validate({ body: eventBody }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const b = eventBody.parse(req.body);
      if (b.endsAt && new Date(b.endsAt) < new Date(b.startsAt)) {
        res.status(400).json({ error: 'validation_error', details: [{ path: ['endsAt'], message: 'endsAt must be >= startsAt' }] });
        return;
      }
      const event = await prisma.event.create({
        data: {
          title: b.title, type: b.type, city: b.city, country: b.country, location: b.location,
          description: b.description, startsAt: new Date(b.startsAt),
          endsAt: b.endsAt ? new Date(b.endsAt) : null, url: b.url, fieldId: b.fieldId,
          status: b.status, clubId: clubIdOf(req),
        },
      });
      res.status(201).json({ event });
    } catch (e) {
      next(e);
    }
  },
);

// Ownership guard: a club can only touch its own events (others → 404, no leakage).
async function ownEvent(clubId: number, id: number) {
  return prisma.event.findFirst({ where: { id, clubId } });
}

// PATCH /api/clubs/me/events/:id — partial update incl. draft→approved publish.
r.patch(
  '/clubs/me/events/:id',
  validate({ params: idParam, body: eventUpdateSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const existing = await ownEvent(clubIdOf(req), id);
      if (!existing) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const b = eventUpdateSchema.parse(req.body);
      const startsAt = b.startsAt ? new Date(b.startsAt) : existing.startsAt;
      const endsAt = b.endsAt !== undefined ? (b.endsAt ? new Date(b.endsAt) : null) : existing.endsAt;
      if (endsAt && endsAt < startsAt) {
        res.status(400).json({ error: 'validation_error', details: [{ path: ['endsAt'], message: 'endsAt must be >= startsAt' }] });
        return;
      }
      const event = await prisma.event.update({
        where: { id },
        data: {
          ...(b.title !== undefined && { title: b.title }),
          ...(b.type !== undefined && { type: b.type }),
          ...(b.city !== undefined && { city: b.city }),
          ...(b.country !== undefined && { country: b.country }),
          ...(b.location !== undefined && { location: b.location }),
          ...(b.description !== undefined && { description: b.description }),
          ...(b.startsAt !== undefined && { startsAt }),
          ...(b.endsAt !== undefined && { endsAt }),
          ...(b.url !== undefined && { url: b.url }),
          ...(b.fieldId !== undefined && { fieldId: b.fieldId }),
          ...(b.status !== undefined && { status: b.status }),
        },
      });
      res.json({ event });
    } catch (e) {
      next(e);
    }
  },
);

// DELETE /api/clubs/me/events/:id — delete own event (cascades subscriptions).
r.delete(
  '/clubs/me/events/:id',
  validate({ params: idParam }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = idParam.parse(req.params);
      const existing = await ownEvent(clubIdOf(req), id);
      if (!existing) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      await prisma.event.delete({ where: { id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

export default r;
