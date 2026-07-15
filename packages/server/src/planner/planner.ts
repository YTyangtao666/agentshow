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

    // 2. 检查是否有API key — 没有则使用Demo Plan
    if (!this.llm.hasApiKey()) {
      return this.getDemoPlan(intent, elements);
    }

    // 3. 构建配置功能描述
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

  private getDemoPlan(intent: string, elements: PageElement[]): PlanResult {
    // Demo plan: navigate to common InkMuse features
    const intentLower = intent.toLowerCase();

    // 尝试匹配页面上的元素
    const createNovelLink = elements.find(
      (e) => e.text.includes('创建作品') || e.text.includes('创建') || e.text.includes('新篇章'),
    );
    const aiAssistantLink = elements.find(
      (e) => e.text.includes('AI') || e.text.includes('助手'),
    );
    const knowledgeLink = elements.find(
      (e) => e.text.includes('知识库') || e.text.includes('知识'),
    );
    const statsLink = elements.find(
      (e) => e.text.includes('统计') || e.text.includes('数据'),
    );

    const steps: PlanStep[] = [];

    if (intentLower.includes('创建') || intentLower.includes('作品') || intentLower.includes('小说') || intentLower.includes('写')) {
      if (createNovelLink) {
        steps.push({
          action: 'highlight',
          selector: createNovelLink.selector,
          narrate: '让我为你展示「创建作品」功能，这是你开始新创作的入口',
          duration: 3000,
        });
        steps.push({
          action: 'click',
          selector: createNovelLink.selector,
          narrate: '点击进入创建作品页面',
        });
      } else {
        steps.push({
          action: 'navigate',
          url: '/novels/new',
          narrate: '导航到创建作品页面',
        });
      }
    } else if (intentLower.includes('ai') || intentLower.includes('助手') || intentLower.includes('智能')) {
      const target = aiAssistantLink;
      if (target) {
        steps.push({
          action: 'highlight',
          selector: target.selector,
          narrate: '这是AI助手，它可以帮助你智能续写、润色文章',
          duration: 3000,
        });
        steps.push({
          action: 'click',
          selector: target.selector,
          narrate: '点击打开AI助手',
        });
      }
    } else if (intentLower.includes('知识') || intentLower.includes('素材')) {
      const target = knowledgeLink;
      if (target) {
        steps.push({
          action: 'highlight',
          selector: target.selector,
          narrate: '知识库可以管理你的创作素材和参考资料',
          duration: 3000,
        });
        steps.push({
          action: 'click',
          selector: target.selector,
          narrate: '点击进入知识库',
        });
      }
    } else if (intentLower.includes('统计') || intentLower.includes('数据')) {
      const target = statsLink;
      if (target) {
        steps.push({
          action: 'highlight',
          selector: target.selector,
          narrate: '数据统计展示你的创作历程和成果',
          duration: 3000,
        });
        steps.push({
          action: 'click',
          selector: target.selector,
          narrate: '点击查看数据统计',
        });
      }
    } else {
      // 默认：展示首页主要功能
      if (createNovelLink) {
        steps.push({
          action: 'highlight',
          selector: createNovelLink.selector,
          narrate: '这里是「创建作品」入口，可以开始新的小说创作',
          duration: 2500,
        });
      }
      if (aiAssistantLink) {
        steps.push({
          action: 'highlight',
          selector: aiAssistantLink.selector,
          narrate: 'AI助手为你提供智能写作辅助',
          duration: 2500,
        });
      }
      if (knowledgeLink) {
        steps.push({
          action: 'highlight',
          selector: knowledgeLink.selector,
          narrate: '知识库管理你的创作素材',
          duration: 2500,
        });
      }
    }

    if (steps.length === 0) {
      steps.push({
        action: 'highlight',
        narrate: '欢迎使用InkMuse智能叙事工坊！请在左侧导航中选择你需要的功能。',
        duration: 3000,
      });
    }

    return {
      reply: '好的，我来为你演示！',
      steps,
      cached: false,
    };
  }
}
