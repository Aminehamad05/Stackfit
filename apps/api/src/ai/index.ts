// AI layer — DISABLED boundary.
//
// The whole app runs without any LLM provider. Every AI-backed feature
// (taster review, interviewer, question generation/review, poster extraction)
// goes through `getAi()` and receives a 503 `ai_disabled` until the layer is
// re-enabled. Nothing in `modules/` imports an LLM SDK.
//
// To re-enable later:
//   1. Set AI_ENABLED=true and configure provider env vars.
//   2. Add a provider implementing `AiProvider` (e.g. OpenAI-compatible client).
//   3. Return it from `getAi()` instead of throwing.
// The prompt docs under `../llm/prompts/*.md` are inert markdown —
// they are never imported at runtime.

export class AiDisabledError extends Error {
  readonly status = 503;
  readonly code = 'ai_disabled';
  constructor(feature = 'ai') {
    super(
      `AI layer is disabled (feature: ${feature}). Set AI_ENABLED=true and configure a provider — see apps/api/src/ai/.`,
    );
    this.name = 'AiDisabledError';
  }
}

/** Future provider surface. Keep narrow: one method per AI job in AGENT_SPEC §4. */
export interface AiProvider {
  readonly name: string;
  reviewTaster(input: unknown): Promise<unknown>;
  interviewReply(input: unknown): Promise<unknown>;
  generateQuestion(input: unknown): Promise<unknown>;
  reviewQuestion(input: unknown): Promise<unknown>;
  extractEvent(input: unknown): Promise<unknown>;
  explainFieldMatch(input: unknown): Promise<unknown>;
}

export function isAiEnabled(): boolean {
  return process.env.AI_ENABLED === 'true';
}

/** Throws AiDisabledError while the layer is off. Call from AI-backed routes only. */
export function getAi(feature = 'ai'): AiProvider {
  void feature;
  throw new AiDisabledError(feature);
}
