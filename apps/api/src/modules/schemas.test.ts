import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema, registerSchema } from './auth/schemas.js';
import { eventBody, eventUpdateSchema } from './events/schemas.js';

describe('request schemas', () => {
  it('register requires a valid email and 8+ char password', () => {
    assert.equal(registerSchema.safeParse({ email: 'a@b.com', password: 'password123' }).success, true);
    assert.equal(registerSchema.safeParse({ email: 'nope', password: 'password123' }).success, false);
    assert.equal(registerSchema.safeParse({ email: 'a@b.com', password: 'short' }).success, false);
  });

  it('event creation defaults status to draft', () => {
    const r = eventBody.parse({
      title: 'T', type: 'meetup', country: 'Tunisia', startsAt: '2026-12-01T17:00:00Z',
    });
    assert.equal(r.status, 'draft');
  });

  it('event update schema is fully partial (PATCH with one field validates)', () => {
    const r = eventUpdateSchema.parse({ status: 'approved' });
    assert.deepEqual(r, { status: 'approved' });
  });
});
