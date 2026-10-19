import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validate } from './validate.js';
import type { NextFunction, Request, Response } from 'express';

function mocks(body: unknown) {
  const req = { body, params: {}, query: {} } as unknown as Request;
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
  let nextCalled = false;
  let nextErr: unknown;
  const next: NextFunction = (err?: unknown) => {
    nextCalled = true;
    nextErr = err;
  };
  return { req, res, next, status: () => statusCode, body: () => payload, passed: () => nextCalled && nextErr === undefined };
}

describe('validate middleware', () => {
  const schema = z.object({ email: z.string().email(), n: z.coerce.number().int() });

  it('parses and replaces req.body, then calls next()', () => {
    const m = mocks({ email: 'a@b.com', n: '3' });
    validate({ body: schema })(m.req, m.res, m.next);
    assert.equal(m.passed(), true);
    assert.deepEqual((m.req.body as Record<string, unknown>).n, 3);
  });

  it('short-circuits invalid bodies with 400 + details', () => {
    const m = mocks({ email: 'nope' });
    validate({ body: schema })(m.req, m.res, m.next);
    assert.equal(m.status(), 400);
    const payload = m.body() as { error: string; details: unknown[] };
    assert.equal(payload.error, 'validation_error');
    assert.ok(payload.details.length > 0);
  });

  it('forwards non-Zod errors to next(err)', () => {
    const boom = new Error('boom');
    const throwing = { parse: () => { throw boom; } } as unknown as z.ZodTypeAny;
    const m = mocks({});
    validate({ body: throwing })(m.req, m.res, m.next);
    assert.equal(m.status(), 0);
  });
});
