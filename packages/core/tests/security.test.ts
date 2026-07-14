import { describe, it, expect } from 'vitest';
import { validatePlan } from '../src/security.js';
import type { PlanStep } from '@agentshow/shared';

describe('validatePlan', () => {
  it('允许合法的action通过', () => {
    const steps: PlanStep[] = [
      { action: 'click', selector: '#btn', narrate: '点击' },
      { action: 'type', selector: '#input', value: 'hello', narrate: '输入' },
      { action: 'wait', condition: '.result', timeout: 5000 },
    ];
    const result = validatePlan(steps);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('不允许的action被拒绝', () => {
    const steps: PlanStep[] = [
      { action: 'eval' as any, selector: '#btn' },
    ];
    const result = validatePlan(steps);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('eval');
  });

  it('type操作的value超长被拒绝', () => {
    const steps: PlanStep[] = [
      { action: 'type', value: 'x'.repeat(1001) },
    ];
    const result = validatePlan(steps);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('1000');
  });

  it('plan步数超限被拒绝', () => {
    const steps: PlanStep[] = Array.from({ length: 21 }, () => ({
      action: 'click' as const,
      selector: '#btn',
    }));
    const result = validatePlan(steps);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('超限');
  });

  it('危险关键词产生警告但不阻止', () => {
    const steps: PlanStep[] = [
      { action: 'click', narrate: '点击删除按钮' },
    ];
    const result = validatePlan(steps);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
