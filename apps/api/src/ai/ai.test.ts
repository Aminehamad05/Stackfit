import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDisabledError, getAi, isAiEnabled } from './index.js';
import { ChatDisabledError, getChatProvider } from './provider.js';

describe('AI layer boundary (disabled by default)', () => {
  it('getAi always throws a 503 AiDisabledError', () => {
    assert.throws(() => getAi('interview'), (e: unknown) => {
      assert.ok(e instanceof AiDisabledError);
      assert.equal(e.status, 503);
      assert.equal(e.code, 'ai_disabled');
      return true;
    });
  });

  it('isAiEnabled follows the env flag only', () => {
    const prev = process.env.AI_ENABLED;
    process.env.AI_ENABLED = 'true';
    assert.equal(isAiEnabled(), true);
    delete process.env.AI_ENABLED;
    assert.equal(isAiEnabled(), false);
    if (prev !== undefined) process.env.AI_ENABLED = prev;
  });
});

describe('chat provider gate', () => {
  it('throws ChatDisabledError (503) without LLM_API_KEY', () => {
    const prev = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;
    assert.throws(() => getChatProvider(), (e: unknown) => {
      assert.ok(e instanceof ChatDisabledError);
      assert.equal(e.status, 503);
      assert.equal(e.code, 'chat_disabled');
      return true;
    });
    if (prev !== undefined) process.env.LLM_API_KEY = prev;
  });
});
