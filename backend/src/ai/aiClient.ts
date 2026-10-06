import { env } from '../config/env';
import { AppError } from '../utils/errors';

export interface AiClient { complete(system: string, user: string): Promise<string>; }

/** DEVELOPMENT ONLY: no external call. Used so search/profile-assist are testable without an API key. */
class MockAiClient implements AiClient {
  async complete(_system: string, _user: string): Promise<string> {
    throw new AppError(501, 'AI_MOCK_NO_GENERATION', 'AI text generation needs ANTHROPIC_API_KEY (AI_PROVIDER=live). Structured/rule-based features still work without it.');
  }
}

class AnthropicAiClient implements AiClient {
  async complete(system: string, user: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 500, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!res.ok) throw new AppError(502, 'AI_UPSTREAM_ERROR', 'AI service is unavailable right now.');
    const json = await res.json();
    return (json.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
  }
}

export const aiClient: AiClient = env.AI_PROVIDER === 'live' ? new AnthropicAiClient() : new MockAiClient();
export const aiIsLive = env.AI_PROVIDER === 'live';
