import type { AgentShowConfig } from '@agentshow/shared';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const PROVIDER_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  glm: 'https://open.bigmodel.cn/api/paas/v4',
  ollama: 'http://localhost:11434/v1',
};

const DEFAULT_TIMEOUT = 30000; // 30s

export class LLMClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeout: number;

  constructor(config: AgentShowConfig['ai']) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl ?? PROVIDER_URLS[config.provider] ?? PROVIDER_URLS.deepseek;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  hasApiKey(): boolean {
    return !!this.apiKey && !this.apiKey.startsWith('${');
  }

  async chat(
    messages: ChatMessage[],
    options?: { jsonMode?: boolean; temperature?: number },
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.3,
    };
    if (options?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    // AbortController for timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM API error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
      };
      return data.choices[0].message.content;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${this.timeout / 1000}s`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
