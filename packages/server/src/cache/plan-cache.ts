import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getCacheKey } from '@agentshow/core';
import type { CachedPlan } from '@agentshow/shared';

export class PlanCache {
  private cacheDir: string;

  constructor(projectRoot: string) {
    this.cacheDir = resolve(projectRoot, '.agentshow', 'cache', 'plans');
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  get(intent: string, pageUrl: string): CachedPlan | null {
    const key = getCacheKey(intent, pageUrl);
    const filePath = join(this.cacheDir, `${key}.json`);
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as CachedPlan;
  }

  set(plan: CachedPlan): void {
    const key = getCacheKey(plan.intent, plan.pageUrl);
    const filePath = join(this.cacheDir, `${key}.json`);
    writeFileSync(filePath, JSON.stringify(plan, null, 2));
  }

  updateSelector(
    intent: string,
    pageUrl: string,
    stepIndex: number,
    newSelector: string,
  ): void {
    const plan = this.get(intent, pageUrl);
    if (!plan) return;
    plan.steps[stepIndex].selector = newSelector;
    this.set(plan);
  }

  clear(): void {
    const files = readdirSync(this.cacheDir);
    for (const f of files) {
      if (f.endsWith('.json')) unlinkSync(join(this.cacheDir, f));
    }
  }
}
