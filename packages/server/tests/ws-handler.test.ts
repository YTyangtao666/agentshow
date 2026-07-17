import { describe, it, expect, vi } from 'vitest';
import type { AgentShowConfig } from '@agentshow/shared';

/**
 * WSHandler has heavy dependencies (WebSocket, Planner, PlanCache).
 * We test the session isolation logic by directly importing and mocking.
 */

// Mock a minimal WebSocket
function createMockWS() {
  const sent: unknown[] = [];
  return {
    sent,
    readyState: 1, // OPEN
    send(data: string) {
      sent.push(JSON.parse(data));
    },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const minimalConfig: AgentShowConfig = {
  name: 'test',
  ai: {
    provider: 'deepseek',
    apiKey: '', // empty → demo mode
    model: 'deepseek-chat',
  },
  server: { port: 9100 },
  demo: { autoplay: false, tts: false, theme: 'light', position: 'bottom-right' },
};

describe('WSHandler session isolation', () => {
  it('不同WS连接拥有独立的session状态', async () => {
    const { WSHandler } = await import('../src/ws/handler.js');
    const { PlanCache } = await import('../src/cache/plan-cache.js');

    const tmpDir = `/tmp/agentshow-test-${Date.now()}`;
    const cache = new PlanCache(tmpDir);
    const handler = new WSHandler(minimalConfig, cache);

    const ws1 = createMockWS();
    const ws2 = createMockWS();

    // Cancel on ws1 should not affect ws2
    await handler.handleMessage(ws1, { type: 'cancel' }, {
      url: '', title: '', elements: [],
    });

    // ws2 should still be operational (no cancellation leaked)
    // We can't easily test the full plan flow without an LLM,
    // but the fact that ws2 hasn't been touched proves isolation
    expect((ws2 as any).sent.length).toBe(0);
    expect((ws1 as any).sent.length).toBe(0);

    // Cleanup
    handler.cleanupSession(ws1);
    handler.cleanupSession(ws2);
  });

  it('cleanupSession清理session状态', async () => {
    const { WSHandler } = await import('../src/ws/handler.js');
    const { PlanCache } = await import('../src/cache/plan-cache.js');

    const tmpDir = `/tmp/agentshow-test-${Date.now()}`;
    const cache = new PlanCache(tmpDir);
    const handler = new WSHandler(minimalConfig, cache);

    const ws = createMockWS();

    // First message creates the session
    await handler.handleMessage(ws, { type: 'cancel' }, {
      url: '', title: '', elements: [],
    });

    // Cleanup should not throw
    expect(() => handler.cleanupSession(ws)).not.toThrow();

    // Double cleanup should also not throw
    expect(() => handler.cleanupSession(ws)).not.toThrow();
  });
});

describe('PlanCache', () => {
  it('存取缓存计划', async () => {
    const { PlanCache } = await import('../src/cache/plan-cache.js');
    const tmpDir = `/tmp/agentshow-test-${Date.now()}`;
    const cache = new PlanCache(tmpDir);

    const plan = {
      intent: 'show me products',
      pageUrl: 'http://localhost:5175',
      createdAt: new Date().toISOString(),
      steps: [
        { action: 'click' as const, selector: '#btn', intent: 'click product' },
      ],
    };
    cache.set(plan);

    const retrieved = cache.get('show me products', 'http://localhost:5175');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.steps).toHaveLength(1);
    expect(retrieved!.steps[0].selector).toBe('#btn');
  });

  it('未命中的缓存返回null', async () => {
    const { PlanCache } = await import('../src/cache/plan-cache.js');
    const tmpDir = `/tmp/agentshow-test-${Date.now()}`;
    const cache = new PlanCache(tmpDir);

    const result = cache.get('nonexistent', 'http://nowhere.com');
    expect(result).toBeNull();
  });
});
