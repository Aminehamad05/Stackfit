import { Router, type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../prisma.js';
import { requireAuth, signToken, type AuthenticatedRequest } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, registerSchema } from './schemas.js';
import { passwordSchema } from '../../schemas/common.js';

const r = Router();

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

const meUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  // Profile photo: https URL (≤2000 chars) or PNG/JPEG/WebP dataURL whose
  // decoded bytes fit ≤400KB (well under the 1mb JSON body limit).
  avatarUrl: z.string().max(600_000).nullable().optional(),
});

function avatarProblem(v: string | null | undefined): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (/^https?:\/\/[^\s]{1,2000}$/.test(v)) return null;
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!m) return 'avatar must be an https URL or a PNG/JPEG/WebP dataURL';
  const bytes = Math.floor((m[2].length * 3) / 4);
  if (bytes > 400 * 1024) return 'avatar image must fit 400KB (upload a smaller photo)';
  return null;
}

// GET /api/auth/me — who am I (id, email, displayName for greetings).
r.get(
  '/me',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.sub ?? -1 },
        select: { id: true, email: true, displayName: true, avatarUrl: true },
      });
      if (!user) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json({ user });
    } catch (e) {
      next(e);
    }
  },
);

// PATCH /api/auth/me — manage your own profile (name + photo).
r.patch(
  '/me',
  requireAuth,
  validate({ body: meUpdateSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = meUpdateSchema.parse(req.body);
      const problem = avatarProblem(body.avatarUrl);
      if (problem) {
        res.status(400).json({ error: 'validation_error', details: [{ path: ['avatarUrl'], message: problem }] });
        return;
      }
      const data: { displayName?: string; avatarUrl?: string | null } = {};
      if (body.displayName !== undefined) data.displayName = body.displayName;
      if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl === '' ? null : body.avatarUrl;
      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: 'validation_error', details: [{ path: [], message: 'nothing to update' }] });
        return;
      }
      const user = await prisma.user.update({
        where: { id: req.user?.sub ?? -1 },
        data,
        select: { id: true, email: true, displayName: true, avatarUrl: true },
      });
      res.json({ user });
    } catch (e) {
      next(e);
    }
  },
);

// POST /api/auth/password — change your own password (current required).
r.post(
  '/password',
  requireAuth,
  validate({ body: passwordChangeSchema }),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { id: req.user?.sub ?? -1 } });
      if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        res.status(401).json({ error: 'invalid_credentials', message: 'current password is incorrect' });
        return;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(newPassword, 10) },
      });
      res.json({ changed: true });
    } catch (e) {
      next(e);
    }
  },
);

// DELETE /api/auth/me — delete your account and all associated data
// (progress, submissions, points — relations cascade). This is final.
r.delete(
  '/me',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await prisma.user.delete({ where: { id: req.user?.sub ?? -1 } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

// POST /api/auth/register + POST /api/auth/login (JWT, email/password — hackathon-simple)
r.post(
  '/register',
  validate({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, displayName } = registerSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, displayName, passwordHash },
      });
      res
        .status(201)
        .json({ token: signToken(user), user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } });
    } catch (e) {
      next(e);
    }
  },
);

r.post(
  '/login',
  validate({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }
      res.json({ token: signToken(user), user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
