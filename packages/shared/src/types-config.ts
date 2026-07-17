import type { PlanStep } from './types-plan.js';

export interface AgentShowConfig {
  name: string;
  description?: string;
  version?: string;

  ai: {
    provider: 'deepseek' | 'openai' | 'glm' | 'ollama';
    apiKey: string;
    baseUrl?: string;
    model: string;
    language?: string;
    /** Request timeout in ms (default: 30000) */
    timeout?: number;
  };

  server: {
    port: number;
    dev?: boolean;
  };

  demo: {
    autoplay?: boolean;
    tts?: boolean;
    theme?: 'auto' | 'light' | 'dark';
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  };

  features?: FeatureDef[];
  playbooks?: PlaybookDef[];
  pages?: PageKnowledge[];

  dangerousSelectors?: string[];
  dangerousKeywords?: string[];
}

export interface FeatureDef {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  steps: PlanStep[];
}

export interface PlaybookDef {
  id: string;
  name: string;
  description: string;
  features: string[];
}

export interface PageKnowledge {
  url: string;
  description: string;
  elements: Record<string, string>;
}
