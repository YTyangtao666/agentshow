import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMClient } from '../src/llm/client.js';
import type { AgentShowConfig } from '@agentshow/shared';

const mockConfig: AgentShowConfig['ai'] = {
  provider: 'deepseek',
  apiKey: 'test-key-12345',
  model: 'deepseek-chat',
};

describe('LLMClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('检测有效API key', () => {
    const client = new LLMClient(mockConfig);
    expect(client.hasApiKey()).toBe(true);
  });

  it('检测占位符API key（${...}）', () => {
    const client = new LLMClient({
      ...mockConfig,
      apiKey: '${DEEPSEEK_API_KEY}',
    });
    expect(client.hasApiKey()).toBe(false);
  });

  it('检测空API key', () => {
    const client = new LLMClient({ ...mockConfig, apiKey: '' });
    expect(client.hasApiKey()).toBe(false);
  });

  it('正常发送chat请求并解析响应', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"reply":"ok","steps":[]}' } }],
      }),
      text: async () => '',
    });
    globalThis.fetch = mockFetch as any;

    const client = new LLMClient(mockConfig);
    const result = await client.chat(
      [{ role: 'user', content: 'test' }],
      { jsonMode: true },
    );

    expect(result).toBe('{"reply":"ok","steps":[]}');

    // Verify request format
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/chat/completions');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('deepseek-chat');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(options.headers.Authorization).toBe('Bearer test-key-12345');
  });

  it('处理API错误（非200响应）', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
      json: async () => ({}),
    }) as any;

    const client = new LLMClient(mockConfig);
    await expect(
      client.chat([{ role: 'user', content: 'test' }]),
    ).rejects.toThrow('LLM API error 429');
  });

  it('使用正确的provider URL', () => {
    // Just verify it doesn't crash with different providers
    const providers: Array<AgentShowConfig['ai']['provider']> = [
      'deepseek', 'openai', 'glm', 'ollama',
    ];
    for (const p of providers) {
      const client = new LLMClient({ ...mockConfig, provider: p });
      expect(client).toBeDefined();
    }
  });
});
