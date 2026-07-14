import type {
  AgentShowConfig,
  PageElement,
  PlanStep,
  CachedPlan,
} from '@agentshow/shared';
import { validatePlan } from '@agentshow/core';
import { LLMClient, type ChatMessage } from '../llm/client.js';
import { buildPlanPrompt } from './prompts.js';
import type { PlanCache } from '../cache/plan-cache.js';

export interface PlanResult {
  reply: string;
  steps: PlanStep[];
  cached: boolean;
}

export class Planner {
  private llm: LLMClient;
  private cache: PlanCache;
  private config: AgentShowConfig;

  constructor(config: AgentShowConfig, cache: PlanCache) {
    this.config = config;
    this.llm = new LLMClient(config.ai);
    this.cache = cache;
  }

  async plan(
    intent: string,
    pageUrl: string,
    pageTitle: string,
    elements: PageElement[],
  ): Promise<PlanResult> {
    // 1. 缓存优先
    const cached = this.cache.get(intent, pageUrl);
    if (cached) {
      return {
        reply: '好的，我为你演示（缓存命中）',
        steps: cached.steps,
        cached: true,
      };
    }

    // 2. 构建配置功能描述
    const featuresText = this.config.features
      ?.map(
        (f) =>
          `- "${f.name}": ${f.description} (关键词: ${f.keywords.join(', ')})`,
      )
      .join('\n');

    // 3. LLM规划
    const messages = buildPlanPrompt(
      intent,
      pageUrl,
      pageTitle,
      elements,
      featuresText,
    );
    const raw = await this.llm.chat(messages, {
      jsonMode: true,
      temperature: 0.3,
    });

    // 4. 解析
    let parsed: { reply: string; steps: PlanStep[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`LLM返回无法解析: ${raw.slice(0, 200)}`);
    }

    // 5. 校验
    const validation = validatePlan(parsed.steps, {
      dangerousKeywords: this.config.dangerousKeywords,
      dangerousSelectors: this.config.dangerousSelectors,
    });
    if (!validation.valid) {
      throw new Error(`Plan校验失败: ${validation.errors.join('; ')}`);
    }

    // 6. 缓存
    const cachedPlan: CachedPlan = {
      intent,
      pageUrl,
      createdAt: new Date().toISOString(),
      steps: parsed.steps.map((s) => ({
        ...s,
        selector: s.selector ?? '',
        intent: s.intent ?? s.narrate ?? '',
      })) as any,
    };
    this.cache.set(cachedPlan);

    return {
      reply: parsed.reply,
      steps: parsed.steps,
      cached: false,
    };
  }
}
