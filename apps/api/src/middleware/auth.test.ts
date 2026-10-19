import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { NextFunction, Response } from 'express';
import {
  requireAuth,
  requireClub,
  signClubToken,
  signToken,
  type AuthenticatedRequest,
} from './auth.js';

process.env.JWT_SECRET ??= 'test-secret';

function ctx(token?: string) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} } as unknown as AuthenticatedRequest;
  let statusCode = 0;
  let payload: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      payload = data;
      return this;
    },
  } as unknown as Response;
  let advanced = false;
  const next: NextFunction = () => {
    advanced = true;
  };
  return { req, res, next, status: () => statusCode, body: () => payload, advanced: () => advanced };
}

describe('auth middleware', () => {
  it('requireAuth accepts a user token and attaches req.user', () => {
    const c = ctx(signToken({ id: 7, email: 'u@x.com' }));
    requireAuth(c.req, c.res, c.next);
    assert.equal(c.advanced(), true);
    assert.deepEqual(c.req.user, { sub: 7, email: 'u@x.com' });
  });

  it('requireAuth rejects missing/garbage tokens with 401', () => {
    const missing = ctx();
    requireAuth(missing.req, missing.res, missing.next);
    assert.equal(missing.status(), 401);

    const garbage = ctx('garbage');
    requireAuth(garbage.req, garbage.res, garbage.next);
    assert.equal(garbage.status(), 401);
  });

  it('requireAuth rejects club tokens with 403 (cross-role guard)', () => {
    const c = ctx(signClubToken({ id: 3, email: 'c@club.com' }));
    requireAuth(c.req, c.res, c.next);
    assert.equal(c.status(), 403);
    assert.equal(c.advanced(), false);
  });

  it('requireClub accepts club tokens and rejects user tokens with 403', () => {
    const club = ctx(signClubToken({ id: 3, email: 'c@club.com' }));
    requireClub(club.req, club.res, club.next);
    assert.equal(club.advanced(), true);
    assert.deepEqual(club.req.club, { type: 'club', clubId: 3, email: 'c@club.com' });

    const user = ctx(signToken({ id: 7, email: 'u@x.com' }));
    requireClub(user.req, user.res, user.next);
    assert.equal(user.status(), 403);
    assert.equal(user.advanced(), false);
  });
});
