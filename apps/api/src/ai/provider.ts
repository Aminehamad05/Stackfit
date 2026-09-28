import OpenAI from 'openai';

// First LIVE AI capability (chat assistant). Provider-neutral: any
// OpenAI-compatible endpoint works — Groq, Gemini (compat endpoint),
// OpenAI, NVIDIA Build. Base URL + model come ONLY from env, never hardcoded.
//
// Required env: LLM_API_KEY (+ optionally LLM_BASE_URL, LLM_MODEL_CHAT).
// Missing key → getChatProvider() throws a 503 the routes translate into
// "chat disabled, add a key" guidance. Everything else in ai/ stays disabled.

export interface ChatMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiProvider {
  readonly name: string;
  chat(messages: ChatMessageInput[], opts?: { maxTokens?: number; temperature?: number }): Promise<string>;
}

class OpenAICompatibleProvider implements AiProvider {
  readonly name = 'openai-compatible';
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new Error('LLM_API_KEY is not set (see .env.example — Groq, Gemini and OpenRouter all offer free keys)');
    }
    this.client = new OpenAI({
      baseURL: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
      apiKey,
    });
    this.model = process.env.LLM_MODEL_CHAT ?? 'llama-3.3-70b-versatile';
  }

  async chat(messages: ChatMessageInput[], opts?: { maxTokens?: number; temperature?: number }): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: opts?.maxTokens ?? 500,
      temperature: opts?.temperature ?? 0.7,
    });
    const text = res.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty reply from LLM provider');
    return text;
  }
}

export class ChatDisabledError extends Error {
  readonly status = 503;
  readonly code = 'chat_disabled';
  constructor(message?: string) {
    super(message ?? 'Chat is disabled: set LLM_API_KEY (see .env.example for free providers).');
    this.name = 'ChatDisabledError';
  }
}

/** Returns a working chat provider, or throws ChatDisabledError (→ 503). */
export function getChatProvider(): AiProvider {
  try {
    return new OpenAICompatibleProvider();
  } catch (e) {
    throw new ChatDisabledError(e instanceof Error ? e.message : undefined);
  }
}
