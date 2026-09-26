import { Router, type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma.js';
import { signToken } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, registerSchema } from './schemas.js';

const r = Router();

// POST /api/auth/register + POST /api/auth/login (JWT, email/password — hackathon-simple)
r.post(
  '/register',
  validate({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, displayName } = registerSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, displayName: displayName ?? email.split('@')[0], passwordHash },
      });
      res
        .status(201)
        .json({ token: signToken(user), user: { id: user.id, email: user.email } });
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
      res.json({ token: signToken(user), user: { id: user.id, email: user.email } });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
