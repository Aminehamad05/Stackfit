import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export interface AuthTokenPayload {
  sub: number;
  email: string;
}

export interface ClubTokenPayload {
  type: 'club';
  clubId: number;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
  club?: ClubTokenPayload;
}

const tokenPayloadSchema = z.object({ sub: z.number(), email: z.string() });
const clubPayloadSchema = z.object({ type: z.literal('club'), clubId: z.number(), email: z.string() });

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set');
  }
  return secret ?? 'dev-secret';
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }
  try {
    const payload = tokenPayloadSchema.parse(jwt.verify(token, jwtSecret()));
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export function signToken(user: { id: number; email: string }): string {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret(), { expiresIn: '7d' });
}

export function signClubToken(club: { id: number; email: string }): string {
  return jwt.sign({ type: 'club', clubId: club.id, email: club.email }, jwtSecret(), {
    expiresIn: '7d',
  });
}

/** Club-only guard: rejects missing/invalid tokens AND valid user tokens. */
export function requireClub(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }
  try {
    req.club = clubPayloadSchema.parse(jwt.verify(token, jwtSecret()));
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}
