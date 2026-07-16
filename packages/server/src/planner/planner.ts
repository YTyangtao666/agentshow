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
    const intentLower = intent.toLowerCase();

    // Generic element finder: search by multiple keyword candidates
    const findEl = (...keywords: string[]) =>
      elements.find((e) => keywords.some((kw) => e.text.includes(kw)));

    // Build a highlight + click pair for a matched element
    const highlightAndClick = (
      target: PageElement | undefined,
      highlightMsg: string,
      clickMsg: string,
      fallbackUrl?: string,
    ): PlanStep[] => {
      if (target) {
        return [
          { action: 'highlight', selector: target.selector, narrate: highlightMsg, duration: 2500 },
          { action: 'click', selector: target.selector, narrate: clickMsg },
        ];
      }
      if (fallbackUrl) {
        return [{ action: 'navigate', url: fallbackUrl, narrate: clickMsg }];
      }
      return [];
    };

    const steps: PlanStep[] = [];

    // Define page matchers in priority order (most specific first)
    type Matcher = {
      keywords: string[];          // if intent includes ANY of these
      find: () => PageElement | undefined;
      highlight: string;
      click: string;
      fallback?: string;
    };

    const matchers: Matcher[] = [
      {
        keywords: ['文章', '文案', '公众号', '小红书', '抖音'],
        find: () => findEl('我的文章', '文章', '新建文档'),
        highlight: '这里是文章与文案模块，支持多种内容格式创作',
        click: '点击进入文章列表',
        fallback: '/documents',
      },
      {
        keywords: ['ai', '助手', '智能', '续写', '润色'],
        find: () => findEl('AI 助手', 'AI助手', 'AI'),
        highlight: '这是AI助手，它可以帮助你智能续写、润色文章',
        click: '点击打开AI助手',
        fallback: '/ai/assistant',
      },
      {
        keywords: ['知识库', '知识', '素材', '参考'],
        find: () => findEl('知识库', '知识'),
        highlight: '知识库可以管理你的创作素材和参考资料',
        click: '点击进入知识库',
        fallback: '/kb',
      },
      {
        keywords: ['统计', '数据', '概览'],
        find: () => findEl('数据统计', '统计', '数据'),
        highlight: '数据统计展示你的创作历程和成果',
        click: '点击查看数据统计',
        fallback: '/stats',
      },
      {
        keywords: ['作品库', '我的作品', '书架', '列表'],
        find: () => findEl('我的作品', '作品'),
        highlight: '这是你的作品库，管理所有已创建的小说',
        click: '点击查看作品列表',
        fallback: '/novels',
      },
      {
        keywords: ['创建', '新建', '写', '开始', '小说', '篇章'],
        find: () => findEl('创建作品', '创建', '新篇章', '开始新篇章'),
        highlight: '让我为你展示「创建作品」功能，这是你开始新创作的入口',
        click: '点击进入创建作品页面',
        fallback: '/novels/new',
      },
      {
        keywords: ['导入', '上传小说'],
        find: () => findEl('导入小说', '导入'),
        highlight: '可以导入已有的小说文件到平台',
        click: '点击进入导入页面',
        fallback: '/novels/import',
      },
      {
        keywords: ['导出', '下载'],
        find: () => findEl('导出中心', '导出'),
        highlight: '导出中心可以将你的作品导出为多种格式',
        click: '点击进入导出中心',
        fallback: '/export',
      },
      {
        keywords: ['个人', '设置', 'profile'],
        find: () => findEl('个人中心', '个人', '设置'),
        highlight: '个人中心可以查看和修改你的账户信息',
        click: '点击进入个人中心',
        fallback: '/profile',
      },
      {
        keywords: ['回收站', '删除', '垃圾桶'],
        find: () => findEl('回收站'),
        highlight: '回收站存放已删除的作品和文档',
        click: '点击查看回收站',
        fallback: '/recycle',
      },
    ];

    // Find first matching matcher
    for (const m of matchers) {
      if (m.keywords.some((kw) => intentLower.includes(kw))) {
        steps.push(...highlightAndClick(m.find(), m.highlight, m.click, m.fallback));
        break;
      }
    }

    // Fallback: showcase main features
    if (steps.length === 0) {
      const showcase: Array<{ find: () => PageElement | undefined; msg: string }> = [
        { find: () => findEl('创建作品', '新篇章'), msg: '这里是「创建作品」入口，可以开始新的小说创作' },
        { find: () => findEl('AI 助手', 'AI助手'), msg: 'AI助手为你提供智能写作辅助' },
        { find: () => findEl('知识库'), msg: '知识库管理你的创作素材' },
        { find: () => findEl('我的文章', '文章'), msg: '文章与文案模块支持多种内容创作' },
        { find: () => findEl('数据统计'), msg: '数据统计展示你的创作成果' },
      ];
      for (const s of showcase) {
        const el = s.find();
        if (el) steps.push({ action: 'highlight', selector: el.selector, narrate: s.msg, duration: 2000 });
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
